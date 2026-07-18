# AIQUANTUM: Vietnam Stock Market Regime Detection using Hidden Markov Models

This project provides an automated pipeline for collecting data and detecting market regimes in the Vietnam Stock Market (VN-Index and individual stocks) using Hidden Markov Models (HMM).

## 🎯 Overview
Market regimes (Bull, Bear, Sideways) are critical phases in financial markets. Identifying the current regime helps investors adjust their trading strategies and manage risks effectively. 

AIQUANTUM leverages a multi-level Hidden Markov Model to predict the market states based on various indicators, including:
- **Macro Level**: Macroeconomic indicators (CPI, Credit Growth, PMI, FNB ratio, etc.)
- **Market Level**: Overall VN-Index performance and volatility.
- **Sector/Industry Level**: Cash flow and price actions of specific industries.
- **Ticker Level**: Individual stock price actions, volumes, and returns.

## 🚀 Key Features
- **Automated Data Crawling**: Automatically fetches daily stock data, macroeconomic statistics, and industry classifications (see `crawl/` directory).
- **Data Processing**: Cleans, merges, and normalizes stock metrics and financial indicators (see `data_processing/`).
- **HMM Regime Detection**: Advanced statistical modeling using Hidden Markov Models to classify market periods into `Bull`, `Bear`, and `Sideways` states (see `model/`).
- **Visualization**: Generates insightful charts comparing asset prices (Close/VNIndex) against their predicted regime backgrounds (e.g., Bull = Green, Bear = Red, Sideways = Gray).

## 📂 Project Structure
- `crawl/` - Python scripts for crawling daily financial and macroeconomic data (`crawl_daily.py`, `crawl_marco.py`, etc.).
- `data/` - Raw data storage.
- `data_processing/` - Data cleaning, mapping, and feature engineering logic.
- `model/` - Core HMM implementation (`hmm.py`) and supplementary models.
- `output/` - Predicted probabilities and regime labels saved as CSV files (`macro_hmm_results.csv`, `market_hmm_results.csv`, `sector_hmm_results.csv`, `master_meta_predictions.csv`).
- `c.py` - Visualization script that plots the 4 levels of market regimes on intuitive line charts.
- `main.py` - Main script to execute logic over defined successful tickers.

## 🛠 Getting Started
1. Set up your Python environment and ensure required packages are installed (`pandas`, `matplotlib`, `numpy`, model dependencies, etc.).
2. Run data crawling and processing scripts to update the database.
3. Execute the HMM model pipeline to generate the results in the `output/` folder.
4. Run `python c.py` to visualize the regime charts for Macro, Market, Sector, and Ticker levels.
