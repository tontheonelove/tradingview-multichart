from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Initial dashboard config (ปรับตามที่ต้องการ)
INITIAL_CHARTS = [
    {"id": "c1", "symbol": "BINANCE:BTCUSDT", "interval": "1"},
    {"id": "c2", "symbol": "BINANCE:BTCUSDT", "interval": "5"},
    {"id": "c3", "symbol": "BINANCE:BTCUSDT", "interval": "15"},
    {"id": "c4", "symbol": "BINANCE:BTCUSDT", "interval": "60"},
]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/config")
def config():
    return jsonify({
        "charts": INITIAL_CHARTS,
        "defaultInterval": "60",
        "supportedIntervals": ["1", "3", "5", "15", "30", "60", "240", "1D"],
        "layouts": ["1x1", "2x1", "2x2", "3x1", "3x2"],
        "theme": "dark",
    })

if __name__ == "__main__":
    app.run(debug=True)
