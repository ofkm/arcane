package ws

import (
	"context"
	"log/slog"
	"runtime"
	"sync"
)

type Hub struct {
	mu         sync.RWMutex
	clients    map[*Client]struct{}
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	onEmpty    func()
}

func NewHub(buffer int) *Hub {
	return &Hub{
		clients:    make(map[*Client]struct{}),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte, buffer),
	}
}

func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

func (h *Hub) SetOnEmpty(fn func()) {
	h.mu.Lock()
	h.onEmpty = fn
	h.mu.Unlock()
}

func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			h.closeAll()
			return
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = struct{}{}
			h.mu.Unlock()
		case c := <-h.unregister:
			h.remove(c)
			if h.ClientCount() == 0 {
				go func() {
					runtime.Gosched()
					h.mu.RLock()
					empty := len(h.clients) == 0
					onEmpty := h.onEmpty
					h.mu.RUnlock()
					if empty && onEmpty != nil {
						onEmpty()
					}
				}()
			}
		case msg := <-h.broadcast:
			h.mu.RLock()
			for c := range h.clients {
				select {
				case c.send <- msg:
				default:
					// backpressure: drop slow client
					go h.remove(c)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Broadcast(msg []byte) {
	select {
	case h.broadcast <- msg:
	default:
		// prevent global stall if hub buffer fills
		slog.Warn("websocket hub broadcast buffer full; dropping message")
	}
}

func (h *Hub) remove(c *Client) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
		_ = c.conn.Close()
	}
	h.mu.Unlock()
}

func (h *Hub) closeAll() {
	h.mu.Lock()
	for c := range h.clients {
		close(c.send)
		_ = c.conn.Close()
		delete(h.clients, c)
	}
	h.mu.Unlock()
}
