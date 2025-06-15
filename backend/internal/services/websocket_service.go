package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/ofkm/arcane-backend/internal/models"

	"github.com/gorilla/websocket"
)

type WebSocketService struct {
	agentService *AgentService
	upgrader     websocket.Upgrader
	clients      map[string]*AgentConnection
	clientsMutex sync.RWMutex
	broadcast    chan []byte
	register     chan *AgentConnection
	unregister   chan *AgentConnection
}

type AgentConnection struct {
	AgentID    string
	Connection *websocket.Conn
	Send       chan []byte
	LastSeen   time.Time
}

type WebSocketMessage struct {
	Type      string                 `json:"type"`
	AgentID   string                 `json:"agent_id,omitempty"`
	Data      map[string]interface{} `json:"data,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

type TaskMessage struct {
	Type    string                 `json:"type"`
	TaskID  string                 `json:"task_id"`
	Command string                 `json:"command,omitempty"`
	Args    []string               `json:"args,omitempty"`
	Payload map[string]interface{} `json:"payload,omitempty"`
}

type TaskResultMessage struct {
	Type      string                 `json:"type"`
	TaskID    string                 `json:"task_id"`
	Status    string                 `json:"status"`
	Result    map[string]interface{} `json:"result,omitempty"`
	Error     string                 `json:"error,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

type HeartbeatMessage struct {
	Type      string               `json:"type"`
	AgentID   string               `json:"agent_id"`
	Status    string               `json:"status"`
	Metrics   *models.AgentMetrics `json:"metrics,omitempty"`
	Timestamp time.Time            `json:"timestamp"`
}

func NewWebSocketService(agentService *AgentService) *WebSocketService {
	return &WebSocketService{
		agentService: agentService,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Configure this properly for production
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
		clients:    make(map[string]*AgentConnection),
		broadcast:  make(chan []byte),
		register:   make(chan *AgentConnection),
		unregister: make(chan *AgentConnection),
	}
}

func (ws *WebSocketService) Start() {
	go ws.hub()
}

func (ws *WebSocketService) hub() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case client := <-ws.register:
			ws.clientsMutex.Lock()
			ws.clients[client.AgentID] = client
			ws.clientsMutex.Unlock()
			log.Printf("Agent %s connected via WebSocket", client.AgentID)

		case client := <-ws.unregister:
			ws.clientsMutex.Lock()
			if _, exists := ws.clients[client.AgentID]; exists {
				delete(ws.clients, client.AgentID)
				close(client.Send)
				log.Printf("Agent %s disconnected from WebSocket", client.AgentID)
			}
			ws.clientsMutex.Unlock()

		case message := <-ws.broadcast:
			ws.clientsMutex.RLock()
			for agentID, client := range ws.clients {
				select {
				case client.Send <- message:
				default:
					delete(ws.clients, agentID)
					close(client.Send)
				}
			}
			ws.clientsMutex.RUnlock()

		case <-ticker.C:
			ws.checkConnections()
		}
	}
}

func (ws *WebSocketService) checkConnections() {
	ws.clientsMutex.Lock()
	defer ws.clientsMutex.Unlock()

	now := time.Now()
	for agentID, client := range ws.clients {
		if now.Sub(client.LastSeen) > 2*time.Minute {
			log.Printf("Agent %s connection timed out", agentID)
			delete(ws.clients, agentID)
			close(client.Send)
		}
	}
}

func (ws *WebSocketService) HandleAgentConnection(w http.ResponseWriter, r *http.Request) {
	agentID := r.Header.Get("X-Agent-ID")
	if agentID == "" {
		http.Error(w, "Missing X-Agent-ID header", http.StatusBadRequest)
		return
	}

	// Verify agent exists
	ctx := context.Background()
	_, err := ws.agentService.GetAgentByID(ctx, agentID)
	if err != nil {
		http.Error(w, "Agent not found", http.StatusNotFound)
		return
	}

	conn, err := ws.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection for agent %s: %v", agentID, err)
		return
	}

	client := &AgentConnection{
		AgentID:    agentID,
		Connection: conn,
		Send:       make(chan []byte, 256),
		LastSeen:   time.Now(),
	}

	ws.register <- client

	// Update agent status to online
	ws.agentService.UpdateAgentHeartbeat(ctx, agentID)

	go ws.handleAgentMessages(client)
	go ws.handleAgentWrites(client)

	// Send pending tasks immediately upon connection
	ws.sendPendingTasks(ctx, client)
}

func (ws *WebSocketService) handleAgentMessages(client *AgentConnection) {
	defer func() {
		ws.unregister <- client
		client.Connection.Close()
	}()

	client.Connection.SetReadLimit(512)
	client.Connection.SetReadDeadline(time.Now().Add(60 * time.Second))
	client.Connection.SetPongHandler(func(string) error {
		client.Connection.SetReadDeadline(time.Now().Add(60 * time.Second))
		client.LastSeen = time.Now()
		return nil
	})

	for {
		_, message, err := client.Connection.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error for agent %s: %v", client.AgentID, err)
			}
			break
		}

		client.LastSeen = time.Now()
		ws.processAgentMessage(client, message)
	}
}

func (ws *WebSocketService) handleAgentWrites(client *AgentConnection) {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		client.Connection.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			client.Connection.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				client.Connection.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := client.Connection.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("Failed to write message to agent %s: %v", client.AgentID, err)
				return
			}

		case <-ticker.C:
			client.Connection.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := client.Connection.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (ws *WebSocketService) processAgentMessage(client *AgentConnection, message []byte) {
	var msg WebSocketMessage
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("Failed to parse message from agent %s: %v", client.AgentID, err)
		return
	}

	ctx := context.Background()

	switch msg.Type {
	case "heartbeat":
		ws.handleHeartbeat(ctx, client, msg)
	case "task_result":
		ws.handleTaskResult(ctx, client, msg)
	case "metrics":
		ws.handleMetrics(ctx, client, msg)
	case "docker_info":
		ws.handleDockerInfo(ctx, client, msg)
	default:
		log.Printf("Unknown message type from agent %s: %s", client.AgentID, msg.Type)
	}
}

func (ws *WebSocketService) handleHeartbeat(ctx context.Context, client *AgentConnection, msg WebSocketMessage) {
	ws.agentService.UpdateAgentHeartbeat(ctx, client.AgentID)

	if metrics, ok := msg.Data["metrics"]; ok {
		if metricsData, ok := metrics.(map[string]interface{}); ok {
			agentMetrics := &models.AgentMetrics{}
			if containerCount, ok := metricsData["container_count"].(float64); ok {
				agentMetrics.ContainerCount = int(containerCount)
			}
			if imageCount, ok := metricsData["image_count"].(float64); ok {
				agentMetrics.ImageCount = int(imageCount)
			}
			if stackCount, ok := metricsData["stack_count"].(float64); ok {
				agentMetrics.StackCount = int(stackCount)
			}
			ws.agentService.UpdateAgentMetrics(ctx, client.AgentID, agentMetrics, nil)
		}
	}
}

func (ws *WebSocketService) handleTaskResult(ctx context.Context, client *AgentConnection, msg WebSocketMessage) {
	taskID, ok := msg.Data["task_id"].(string)
	if !ok {
		log.Printf("Invalid task_id in task_result from agent %s", client.AgentID)
		return
	}

	status, ok := msg.Data["status"].(string)
	if !ok {
		log.Printf("Invalid status in task_result from agent %s", client.AgentID)
		return
	}

	result, _ := msg.Data["result"].(map[string]interface{})

	var taskError *string
	if errorMsg, ok := msg.Data["error"].(string); ok && errorMsg != "" {
		taskError = &errorMsg
	}

	taskStatus := models.AgentTaskStatus(status)
	ws.agentService.UpdateTaskStatus(ctx, taskID, taskStatus, result, taskError)
}

func (ws *WebSocketService) handleMetrics(ctx context.Context, client *AgentConnection, msg WebSocketMessage) {
	// Handle metrics update
	log.Printf("Received metrics from agent %s", client.AgentID)
}

func (ws *WebSocketService) handleDockerInfo(ctx context.Context, client *AgentConnection, msg WebSocketMessage) {
	// Handle Docker info update
	log.Printf("Received Docker info from agent %s", client.AgentID)
}

func (ws *WebSocketService) SendTaskToAgent(agentID string, task *models.AgentTask) error {
	ws.clientsMutex.RLock()
	client, exists := ws.clients[agentID]
	ws.clientsMutex.RUnlock()

	if !exists {
		return fmt.Errorf("agent %s not connected", agentID)
	}

	taskMsg := TaskMessage{
		Type:    "task",
		TaskID:  task.ID,
		Payload: task.Payload,
	}

	// Handle different task types
	switch task.Type {
	case models.TaskDockerCommand:
		if command, ok := task.Payload["command"].(string); ok {
			taskMsg.Command = command
		}
		if args, ok := task.Payload["args"].([]interface{}); ok {
			taskMsg.Args = make([]string, len(args))
			for i, arg := range args {
				if argStr, ok := arg.(string); ok {
					taskMsg.Args[i] = argStr
				}
			}
		}
	}

	message, err := json.Marshal(taskMsg)
	if err != nil {
		return fmt.Errorf("failed to marshal task message: %w", err)
	}

	select {
	case client.Send <- message:
		return nil
	default:
		return fmt.Errorf("failed to send task to agent %s: channel full", agentID)
	}
}

func (ws *WebSocketService) sendPendingTasks(ctx context.Context, client *AgentConnection) {
	tasks, err := ws.agentService.GetPendingTasks(ctx, client.AgentID)
	if err != nil {
		log.Printf("Failed to get pending tasks for agent %s: %v", client.AgentID, err)
		return
	}

	for _, task := range tasks {
		if err := ws.SendTaskToAgent(client.AgentID, task); err != nil {
			log.Printf("Failed to send pending task %s to agent %s: %v", task.ID, client.AgentID, err)
		}
	}
}

func (ws *WebSocketService) IsAgentConnected(agentID string) bool {
	ws.clientsMutex.RLock()
	defer ws.clientsMutex.RUnlock()
	_, exists := ws.clients[agentID]
	return exists
}

func (ws *WebSocketService) GetConnectedAgents() []string {
	ws.clientsMutex.RLock()
	defer ws.clientsMutex.RUnlock()

	agents := make([]string, 0, len(ws.clients))
	for agentID := range ws.clients {
		agents = append(agents, agentID)
	}
	return agents
}

func (ws *WebSocketService) BroadcastToAllAgents(message []byte) {
	ws.broadcast <- message
}

func (ws *WebSocketService) SendMessageToAgent(agentID string, message []byte) error {
	ws.clientsMutex.RLock()
	client, exists := ws.clients[agentID]
	ws.clientsMutex.RUnlock()

	if !exists {
		return fmt.Errorf("agent %s not connected", agentID)
	}

	select {
	case client.Send <- message:
		return nil
	default:
		return fmt.Errorf("failed to send message to agent %s: channel full", agentID)
	}
}
