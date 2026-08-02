import numpy as np
import pandas as pd
import warnings
import traceback
import sys
import os
import glob

from ppo import load_data, AdvancedPortfolioEnv, allocate_portfolio_real, CONFIG
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3 import PPO

warnings.filterwarnings('ignore')

if __name__ == "__main__":
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()

    try:
        total_days = len(returns_df)
        # Sß╗¡ dß╗Ñng 22 phi├¬n cuß╗æi c├╣ng ─æß╗â backtest
        n_tradings = 22
        ratio_tradings = n_tradings / total_days
        test_size = int(total_days * ratio_tradings)
        test_start = total_days - test_size

        returns_test = returns_df.iloc[test_start:]
        ai_test = ai_features_df.iloc[test_start:]
        strategies_test = strategies_features_df.iloc[test_start:]
        dates_test = dates[test_start:]

        script_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
        
        # Th╞░ mß╗Ñc chß╗⌐a c├íc model
        model_dir = os.path.join(root_dir, "output", "ppo_model")
        env_path = os.path.join(model_dir, "vec_normalize.pkl")
        
        # T├¼m tß║Ñt cß║ú c├íc file .zip trong th╞░ mß╗Ñc ppo_model
        model_files = glob.glob(os.path.join(model_dir, "*.zip"))
        
        if not model_files:
            print("Γ¥î Kh├┤ng t├¼m thß║Ñy model n├áo trong th╞░ mß╗Ñc:", model_dir)
            sys.exit(1)
            
        print(f"≡ƒöì T├¼m thß║Ñy {len(model_files)} models ─æß╗â ─æ├ính gi├í.")
        print("≡ƒÆí CHß║╛ ─Éß╗ÿ: ─É├ính gi├í bß║▒ng Giß║ú lß║¡p Thß╗▒c tß║┐ (T+2.5, Khß╗¢p L├┤ 100, Tiß╗ün mß║╖t giß╗¢i hß║ín)")
        
        results = []

        def calc_metrics(returns):
            cum_ret = (1 + returns).cumprod()
            total_return = cum_ret.iloc[-1] - 1
            annualized_return = (1 + total_return)**(252 / len(returns)) - 1
            sharpe_ratio = np.sqrt(252) * (returns.mean() / returns.std()) if returns.std() != 0 else 0

            rolling_max = cum_ret.cummax()
            drawdowns = (cum_ret - rolling_max) / rolling_max
            max_drawdown = drawdowns.min()

            win_rate = (returns > 0).mean()
            return total_return, annualized_return, sharpe_ratio, max_drawdown, win_rate

        for model_path in model_files:
            model_name = os.path.basename(model_path)
            print(f"\n≡ƒöä ─Éang giß║ú lß║¡p thß╗▒c chiß║┐n model: {model_name} ...")
            try:
                model = PPO.load(model_path)

                test_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
                        returns_test, ai_test, strategies_test, weights_dim, num_strategies_features, tickers=tickers, dates=dates_test, is_test=True
                    )])
                
                if os.path.exists(env_path):
                    test_env = VecNormalize.load(env_path, test_env)
                    test_env.training = True  # Cho ph├⌐p VecNormalize cß║¡p nhß║¡t li├¬n tß╗Ñc (Rolling Online Learning)
                    test_env.norm_reward = False

                obs = test_env.reset()
                done = [False]

                portfolio_returns = []
                benchmark_returns = []

                # --- SIMULATION STATE ---
                C_initial = 100_000_000.0
                cash = C_initial
                nav = C_initial
                prev_nav = C_initial
                holdings = {}

                step_idx = 0
                while not done[0]:
                    action, _states = model.predict(obs, deterministic=True)
                    obs, reward, done, info = test_env.step(action)
                    
                    raw_action = np.clip(action[0], 0, 1)
                    if np.sum(raw_action) > 1.0:
                        raw_action = raw_action / np.sum(raw_action)
                        
                    strategies_live = strategies_test.iloc[[step_idx]]
                    raw_prices = strategies_live.values[0].reshape(num_strategies_features, weights_dim).T[:, 2]
                    current_prices_vnd = raw_prices * 1000.0
                    price_dict = {tickers[i]: float(current_prices_vnd[i]) for i in range(weights_dim)}

                    # 1. Cß║¡p nhß║¡t ng├áy T+ v├á gi├í
                    total_stock_val = 0.0
                    new_holdings = {}
                    for ticker, h in holdings.items():
                        cur_price = price_dict.get(ticker, h["gia_hien_tai"])
                        h["gia_hien_tai"] = cur_price
                        h["shares_unlocked"] += h["shares_t1"]
                        h["shares_t1"] = h["shares_t2"]
                        h["shares_t2"] = 0
                        h["so_co_phieu"] = h["shares_unlocked"] + h["shares_t1"] + h["shares_t2"]
                        
                        if h["so_co_phieu"] > 0:
                            total_stock_val += h["so_co_phieu"] * cur_price
                            new_holdings[ticker] = h
                    holdings = new_holdings
                    nav = cash + total_stock_val

                    # 2. Sinh lß╗çnh mua b├ín dß╗▒a theo AI
                    ai_alloc = allocate_portfolio_real(
                        tickers=tickers,
                        w=raw_action,
                        p=raw_prices,
                        C=nav,
                        LOT_SIZE=100
                    )
                    
                    target_shares_map = {rec['ma_co_phieu']: rec['so_co_phieu'] for rec in ai_alloc['allocations']}
                    
                    # 2a. Thß╗▒c thi lß╗çnh B├üN
                    for ticker in list(holdings.keys()):
                        cur_h = holdings[ticker]
                        target_shares = target_shares_map.get(ticker, 0)
                        if target_shares < cur_h["so_co_phieu"]:
                            sell_shares = min(cur_h["so_co_phieu"] - target_shares, cur_h["shares_unlocked"])
                            if sell_shares > 0:
                                cash += sell_shares * price_dict[ticker]
                                cur_h["so_co_phieu"] -= sell_shares
                                cur_h["shares_unlocked"] -= sell_shares
                                if cur_h["so_co_phieu"] == 0:
                                    del holdings[ticker]
                                    
                    # 2b. Thß╗▒c thi lß╗çnh MUA
                    for rec in ai_alloc['allocations']:
                        ticker = rec['ma_co_phieu']
                        target_shares = rec['so_co_phieu']
                        price = rec['gia_hien_tai']
                        cur_h = holdings.get(ticker)
                        current_shares = cur_h["so_co_phieu"] if cur_h else 0
                        
                        if target_shares > current_shares:
                            buy_shares = target_shares - current_shares
                            cost = buy_shares * price
                            if cash < cost:
                                buy_shares = int(np.floor(cash / (price * 100))) * 100
                                cost = buy_shares * price
                                
                            if buy_shares > 0:
                                cash -= cost
                                if not cur_h:
                                    holdings[ticker] = {
                                        "so_co_phieu": 0, "gia_von": price, "gia_hien_tai": price,
                                        "shares_unlocked": 0, "shares_t1": 0, "shares_t2": 0
                                    }
                                    cur_h = holdings[ticker]
                                    
                                new_total = cur_h["so_co_phieu"] + buy_shares
                                cur_h["gia_von"] = ((cur_h["so_co_phieu"] * cur_h["gia_von"]) + cost) / new_total
                                cur_h["so_co_phieu"] = new_total
                                cur_h["shares_t2"] += buy_shares
                                cur_h["gia_hien_tai"] = price

                    # 3. T├¡nh to├ín NAV thß║¡t
                    total_stock_val = sum(h["so_co_phieu"] * h["gia_hien_tai"] for h in holdings.values())
                    nav = cash + total_stock_val
                    
                    if step_idx > 0:
                        ret = (nav / prev_nav) - 1
                        portfolio_returns.append(ret)
                    else:
                        portfolio_returns.append(0.0)
                        
                    bm_ret = np.mean(returns_test.iloc[step_idx].values)
                    benchmark_returns.append(bm_ret)
                    
                    prev_nav = nav
                    step_idx += 1

                perf_df = pd.DataFrame({
                    'Real_Simulation': portfolio_returns,
                    'Benchmark_EQ': benchmark_returns
                })

                ai_tot, ai_ann, ai_sharpe, ai_mdd, ai_win = calc_metrics(perf_df['Real_Simulation'])
                bm_tot, bm_ann, bm_sharpe, bm_mdd, bm_win = calc_metrics(perf_df['Benchmark_EQ'])

                cov = np.cov(perf_df['Real_Simulation'], perf_df['Benchmark_EQ'])[0][1]
                var = np.var(perf_df['Benchmark_EQ'])
                beta = cov / var if var > 0 else 1
                alpha = ai_ann - (beta * bm_ann)

                results.append({
                    "Model Name": model_name,
                    "Total Return (%)": ai_tot * 100,
                    "Annual Return (%)": ai_ann * 100,
                    "Sharpe Ratio": ai_sharpe,
                    "Max Drawdown (%)": ai_mdd * 100,
                    "Win Rate (%)": ai_win * 100,
                    "Alpha (%)": alpha * 100,
                    "Beta": beta,
                    "Total Days": len(portfolio_returns),
                    "Final NAV (VND)": nav
                })
                print(f"Γ£à Lß╗úi nhuß║¡n thß╗▒c chiß║┐n: {ai_tot*100:.2f}%, MDD {ai_mdd*100:.2f}%")
            except Exception as inner_e:
                print(f"ΓÜá∩╕Å Lß╗ùi khi ─æ├ính gi├í {model_name}: {inner_e}")

        # Tß╗òng hß╗úp kß║┐t quß║ú
        results_df = pd.DataFrame(results)
        
        # L╞░u ra CSV
        output_csv = os.path.join(root_dir, "output", "real_simulation_results.csv")
        results_df.to_csv(output_csv, index=False, encoding='utf-8-sig')
        
        print("\n=========================================================")
        print("≡ƒôè Bß║óNG Tß╗öNG Hß╗óP HIß╗åU SUß║ñT THß╗░C CHIß║╛N (T+2.5, LOT 100)")
        print("=========================================================")
        print(results_df.to_string(index=False))
        print(f"\n≡ƒôü ─É├ú l╞░u kß║┐t quß║ú chi tiß║┐t tß║íi: {output_csv}")
        
        start_date = dates_test[0]
        end_date = dates_test[-1]
        print(f"\n≡ƒòÆ THß╗£I GIAN KIß╗éM THß╗¼ THß╗░C CHIß║╛N:")
        print(f"   => ─É├ú thß╗▒c hiß╗çn giao dß╗ïch tß╗½ ng├áy {start_date} ─æß║┐n ng├áy {end_date} (Tß╗òng cß╗Öng {len(dates_test)} phi├¬n).")


    except Exception as e:
        print(f"Kh├┤ng thß╗â chß║íy ─æ├ính gi├í. Lß╗ùi: {e}")
        traceback.print_exc()
