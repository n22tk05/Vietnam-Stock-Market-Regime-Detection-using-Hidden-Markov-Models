import sys
import os
import numpy as np
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Configure stdout for UTF-8
sys.stdout.reconfigure(encoding='utf-8')

script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.append(script_dir)

ppo_dir = os.path.join(script_dir, "model", "PPO")
if ppo_dir not in sys.path:
    sys.path.append(ppo_dir)

import ppo
from ppo import load_data, AdvancedPortfolioEnv, allocate_portfolio_real
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

app = FastAPI(
    title="AI QUANTUM Core API",
    description="High-Performance Microservice for HMM Market Regime Detection & PPO Portfolio Allocation",
    version="1.0.0"
)

# Enable CORS for Node.js / Web Frontend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Cache for model & preprocessed data
CACHE = {
    "loaded": False,
    "model": None,
    "vec_env": None,
    "returns_df": None,
    "ai_features_df": None,
    "strategies_features_df": None,
    "weights_dim": None,
    "tickers": None,
    "num_strategies_features": None,
    "dates": None
}

def load_ai_core():
    """Load model and data into memory cache for sub-second inference"""
    print("🔄 Loading AI Core data and models into memory...")
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()
    
    idx = -1
    returns_live = returns_df.iloc[[idx]]
    ai_live = ai_features_df.iloc[[idx]]
    strategies_live = strategies_features_df.iloc[[idx]]
    dates_live = dates[-1:]
    
    save_dir = os.path.join(script_dir, "output", "ppo_model")
    vec_norm_path = os.path.join(save_dir, "vec_normalize.pkl")
    model_path = os.path.join(save_dir, "AI_Brain_v7_Seed4984_Profit_58.06.zip")
    
    live_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
        returns_live, ai_live, strategies_live, weights_dim, num_strategies_features, tickers=tickers, dates=dates_live, is_test=True
    )])
    
    if os.path.exists(vec_norm_path):
        live_env = VecNormalize.load(vec_norm_path, live_env)
        live_env.training = False
        live_env.norm_reward = False
        
    sys.modules['__main__'].AdvancedTickerExtractor = ppo.AdvancedTickerExtractor
    model = PPO.load(model_path)
    
    CACHE["model"] = model
    CACHE["live_env"] = live_env
    CACHE["returns_df"] = returns_df
    CACHE["ai_features_df"] = ai_features_df
    CACHE["strategies_features_df"] = strategies_features_df
    CACHE["weights_dim"] = weights_dim
    CACHE["tickers"] = tickers
    CACHE["num_strategies_features"] = num_strategies_features
    CACHE["dates"] = dates
    CACHE["loaded"] = True
    print("✅ AI Core successfully loaded into memory!")

@app.on_event("startup")
def startup_event():
    load_ai_core()

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "AI QUANTUM Core API",
        "last_trading_date": CACHE["dates"][-1] if CACHE["loaded"] else None,
        "tickers_count": CACHE["weights_dim"] if CACHE["loaded"] else 0
    }

@app.get("/api/recommendation")
def get_recommendation(capital: float = Query(100_000_000, description="Capital in VND")):
    """
    Get live portfolio allocation recommendation from PPO model.
    """
    if not CACHE["loaded"]:
        raise HTTPException(status_code=503, detail="AI Core is still initializing")
        
    if capital < 1_000_000:
        raise HTTPException(status_code=400, detail="Capital must be at least 1,000,000 VND for LOT 100 allocation")
        
    try:
        model = CACHE["model"]
        live_env = CACHE["live_env"]
        tickers = CACHE["tickers"]
        weights_dim = CACHE["weights_dim"]
        num_strategies_features = CACHE["num_strategies_features"]
        strategies_features_df = CACHE["strategies_features_df"]
        dates = CACHE["dates"]
        
        obs = live_env.reset()
        action, _states = model.predict(obs, deterministic=True)
        action = action[0]
        
        action = np.clip(action, 0, 1)
        action_sum = np.sum(action)
        if action_sum > 1.0:
            action = action / action_sum
            
        strategies_live = strategies_features_df.iloc[[-1]]
        current_prices = strategies_live.values[0].reshape(num_strategies_features, weights_dim).T[:, 2]
        
        result = allocate_portfolio_real(
            tickers=tickers,
            w=action,
            p=current_prices,
            C=capital,
            LOT_SIZE=100
        )
        
        return {
            "status": "success",
            "data": {
                "date": dates[-1],
                "capital": capital,
                "warning_flag": result["warning_flag"],
                "warning_msg": result["warning_msg"],
                "allocations": result["allocations"],
                "cash_left": result["cash_left"],
                "used_capital": result["used"],
                "tracking_error": round(result["tracking_error"], 4)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference Error: {str(e)}")

@app.post("/api/reload")
def reload_ai_data():
    """Endpoint to trigger reloading AI data after a fresh crawl"""
    try:
        load_ai_core()
        return {"status": "success", "message": "AI Core reloaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("ai_server:app", host="127.0.0.1", port=8000, reload=True)
