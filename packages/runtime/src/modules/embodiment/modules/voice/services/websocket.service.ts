import WebSocket from 'ws';

interface WebSocketConnection {
    ws: WebSocket;
    callId: string;
    createdAt: Date;
    isConnected: boolean;
}

class VoiceWebsocketConnectionService {
    private connections: Map<string, WebSocketConnection> = new Map();

    constructor() {}

    /**
     * Create a new WebSocket connection to OpenAI Realtime API
     * @param callId - Unique identifier for the call
     * @returns Promise<WebSocket | null> - Returns WebSocket if connection was created, null if already exists
     */
    async createConnection(callId: string, ephemeralKey: string): Promise<WebSocket | null> {
        // Validate callId format
        if (!callId || typeof callId !== 'string' || callId.trim() === '') {
            throw new Error('Invalid callId: must be a non-empty string');
        }

        // Check if connection already exists
        if (this.connections.has(callId)) {
            const existingConnection = this.connections.get(callId);
            if (existingConnection?.isConnected) {
                return null;
            } else {
                // Clean up disconnected connection
                this.connections.delete(callId);
            }
        }

        try {
            const url = `wss://api.openai.com/v1/realtime?call_id=${callId}`;
            const ws = new WebSocket(url, {
                headers: {
                    Authorization: `Bearer ${ephemeralKey}`,
                },
            });

            const connection: WebSocketConnection = {
                ws,
                callId,
                createdAt: new Date(),
                isConnected: false,
            };

            // Set up event handlers
            ws.on('open', () => {
                connection.isConnected = true;
            });

            ws.on('close', (code, reason) => {
                connection.isConnected = false;
                this.connections.delete(callId);
            });

            ws.on('error', (error) => {
                console.error(`Error on connection for callId ${callId}:`, error);
                connection.isConnected = false;
                this.connections.delete(callId);
            });

            // Store the connection
            this.connections.set(callId, connection);
            return ws;
        } catch (error) {
            console.error(`Failed to create WebSocket connection for callId ${callId}:`, error);
            throw error;
        }
    }

    /**
     * Get connection status for a specific callId
     * @param callId - Unique identifier for the call
     * @returns boolean - Returns true if connection exists and is connected
     */
    isConnected(callId: string): boolean {
        const connection = this.connections.get(callId);
        return connection?.isConnected || false;
    }

    /**
     * Get all active connections
     * @returns Array of callIds that have active connections
     */
    getActiveConnections(): string[] {
        return Array.from(this.connections.entries())
            .filter(([_, connection]) => connection.isConnected)
            .map(([callId, _]) => callId);
    }

    /**
     * Destroy a specific WebSocket connection
     * @param callId - Unique identifier for the call
     * @returns boolean - Returns true if connection was destroyed
     */
    destroyConnection(callId: string): boolean {
        const connection = this.connections.get(callId);
        if (!connection) {
            return false;
        }

        try {
            if (connection.isConnected) {
                connection.ws.close(1000, 'Connection destroyed by service');
            }
            this.connections.delete(callId);
            return true;
        } catch (error) {
            console.error(`Error destroying connection for callId ${callId}:`, error);
            return false;
        }
    }

    /**
     * Destroy all WebSocket connections
     * @returns number - Returns the number of connections destroyed
     */
    destroyAllConnections(): number {
        const connectionCount = this.connections.size;

        this.connections.forEach((connection, callId) => {
            try {
                if (connection.isConnected) {
                    connection.ws.close(1000, 'All connections destroyed by service');
                }
            } catch (error) {
                console.error(`Error destroying connection for callId ${callId}:`, error);
            }
        });

        this.connections.clear();
        return connectionCount;
    }

    /**
     * Get connection statistics
     * @returns Object containing connection statistics
     */
    getStats() {
        const totalConnections = this.connections.size;
        const activeConnections = this.getActiveConnections().length;
        const inactiveConnections = totalConnections - activeConnections;

        return {
            total: totalConnections,
            active: activeConnections,
            inactive: inactiveConnections,
            connections: Array.from(this.connections.entries()).map(([callId, connection]) => ({
                callId,
                isConnected: connection.isConnected,
                createdAt: connection.createdAt,
            })),
        };
    }
}

// Export singleton instance
export default new VoiceWebsocketConnectionService();
