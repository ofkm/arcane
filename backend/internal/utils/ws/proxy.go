package ws

import (
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// ProxyHTTP upgrades the incoming client connection and bridges it to remoteWS.
func ProxyHTTP(w http.ResponseWriter, r *http.Request, remoteWS string, header http.Header) error {
	clientConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return err
	}
	defer clientConn.Close()

	dialer := websocket.Dialer{
		Proxy:            http.ProxyFromEnvironment,
		HandshakeTimeout: 45 * time.Second,
	}
	remoteConn, _, err := dialer.Dial(remoteWS, header)
	if err != nil {
		_ = clientConn.WriteMessage(websocket.CloseMessage, []byte{})
		return err
	}
	defer remoteConn.Close()

	errc := make(chan struct{}, 2)

	// client -> remote
	go func() {
		defer func() { errc <- struct{}{} }()
		for {
			mt, msg, err := clientConn.ReadMessage()
			if err != nil {
				return
			}
			if err := remoteConn.WriteMessage(mt, msg); err != nil {
				return
			}
		}
	}()

	// remote -> client
	go func() {
		defer func() { errc <- struct{}{} }()
		for {
			mt, msg, err := remoteConn.ReadMessage()
			if err != nil {
				return
			}
			if err := clientConn.WriteMessage(mt, msg); err != nil {
				return
			}
		}
	}()

	<-errc
	return nil
}
