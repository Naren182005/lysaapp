import http.server
import socketserver
import json

# Define the port
PORT = 3000

# Create a custom request handler
class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # Create a response
        response = {
            'message': 'Server is working!',
            'path': self.path,
            'method': 'GET'
        }
        
        # Send the response
        self.wfile.write(json.dumps(response).encode())
        
        # Print request info
        print(f"Request received: GET {self.path}")
    
    def do_POST(self):
        # Get content length
        content_length = int(self.headers['Content-Length'])
        
        # Read the request body
        post_data = self.rfile.read(content_length)
        
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # Create a response
        response = {
            'message': 'Server is working!',
            'path': self.path,
            'method': 'POST',
            'received_data': post_data.decode('utf-8')
        }
        
        # Send the response
        self.wfile.write(json.dumps(response).encode())
        
        # Print request info
        print(f"Request received: POST {self.path}")
        print(f"Request body: {post_data.decode('utf-8')}")

# Create and start the server
with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    print(f"Python HTTP server running at http://localhost:{PORT}/")
    print("Server will respond to any request with a simple JSON message")
    print("Press Ctrl+C to stop the server")
    
    # Serve until interrupted
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
