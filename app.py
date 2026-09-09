from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='static')
CORS(app)

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/api/simulate', methods=['POST'])
def simulate():
    data = request.json
    rainfall_intensity = data.get('rainfall_intensity', 50)
    storm_duration = data.get('storm_duration', 60)
    return jsonify({'status': 'ok', 'message': 'Simulation endpoint ready'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
