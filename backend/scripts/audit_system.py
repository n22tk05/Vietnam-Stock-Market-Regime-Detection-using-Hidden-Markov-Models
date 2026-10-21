import urllib.request
import urllib.error
import json
import uuid
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://localhost:8000/api/v1'

def api_call(method, endpoint, data=None, token=None):
    url = f'{BASE_URL}{endpoint}'
    headers = {'Content-Type': 'application/json', 'Origin': 'http://localhost:5173'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    encoded_data = json.dumps(data).encode() if data is not None else None
    if method in ('POST', 'PATCH', 'PUT') and encoded_data is None:
        encoded_data = b'{}'
    
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode()
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return e.code, json.loads(body) if body else {'error': str(e)}
    except Exception as e:
        return 500, {'error': str(e)}

results = []

def record(test_name, success, details=''):
    results.append({'test': test_name, 'success': success, 'details': details})
    status_icon = '✅ PASS' if success else '❌ FAIL'
    print(f'{status_icon} - {test_name}: {details}', flush=True)

print('🚀 BẮT ĐẦU RÀ SOÁT TOÀN BỘ CHỨC NĂNG HỆ THỐNG WEALTH4WARD...', flush=True)
print('=' * 65, flush=True)

# --- 1. HEALTH CHECKS ---
status, res = api_call('GET', '/health')
record('1. System Health Check', status == 200 and res.get('data', {}).get('database') == 'healthy', f'Status {status}')

# --- 2. AUTHENTICATION & REGISTRATION ---
test_email = f'audit_{uuid.uuid4().hex[:6]}@wealth4ward.vn'
test_pass = 'AuditSecret123!'
status, res = api_call('POST', '/auth/register', {
    'email': test_email,
    'password': test_pass,
    'fullName': 'Nguyễn Văn Audit'
})
record('2. User Registration (/auth/register)', status in (200, 201) and 'tokens' in res.get('data', {}), f'Status {status}, Email: {test_email}')

tokens = res.get('data', {}).get('tokens', {})
access_token = tokens.get('accessToken')
refresh_token = tokens.get('refreshToken')

# Login test
status, res = api_call('POST', '/auth/login', {'email': test_email, 'password': test_pass})
record('3. User Login (/auth/login)', status == 200 and 'tokens' in res.get('data', {}), f'Status {status}')
if status == 200:
    access_token = res['data']['tokens']['accessToken']
    refresh_token = res['data']['tokens']['refreshToken']

# Get Me
status, res = api_call('GET', '/auth/me', token=access_token)
record('4. Get Current User Profile (/auth/me)', status == 200 and res.get('data', {}).get('email') == test_email, f'Status {status}')

# Refresh Token
status, res = api_call('POST', '/auth/refresh', {'refreshToken': refresh_token})
record('5. Token Refresh (/auth/refresh)', status == 200 and 'accessToken' in res.get('data', {}).get('tokens', {}), f'Status {status}')
if status == 200:
    access_token = res['data']['tokens']['accessToken']

# --- 3. MARKET REGIMES ---
status, res = api_call('GET', '/market/regime/current', token=access_token)
regime_code = res.get('data', {}).get('code')
prob = res.get('data', {}).get('probability')
record('6. Current Market Regime HMM (/market/regime/current)', status == 200 and bool(regime_code), f'Regime: {regime_code}, Prob: {prob}')

status, res = api_call('GET', '/market/regimes?page=1&page_size=10', token=access_token)
regimes_list = res.get('data', []) if isinstance(res.get('data'), list) else res.get('data', {}).get('items', [])
record('7. List Market Regimes History (/market/regimes)', status == 200, f"Count: {len(regimes_list)}")

# --- 4. INVESTMENT PROFILE ONBOARDING ---
status, res = api_call('POST', '/investment-profile', {
    'capital': '200000000',
    'riskAppetite': 'HIGH',
    'investmentHorizon': 'LONG_TERM',
    'expectedReturn': '0.18',
    'maximumDrawdown': '0.15'
}, token=access_token)
record('8. Create Investment Profile (/investment-profile)', status in (200, 201), f'Status {status}')

status, res = api_call('GET', '/investment-profile', token=access_token)
record('9. Get Active Investment Profile', status == 200 and res.get('data', {}).get('riskAppetite') == 'HIGH', f"Capital: {res.get('data', {}).get('capital')}")

# --- 5. RECOMMENDATIONS & AI ALLOCATIONS ---
status, res = api_call('POST', '/recommendations', {'type': 'INITIAL'}, token=access_token)
rec_id = res.get('data', {}).get('id')
allocations = res.get('data', {}).get('allocations', [])
record('10. Generate AI Recommendation (/recommendations)', status in (200, 201) and bool(rec_id), f'Rec ID: {rec_id}, Allocations: {len(allocations)}')

if rec_id:
    status, res = api_call('GET', f'/recommendations/{rec_id}', token=access_token)
    record('11. Get Recommendation Details', status == 200 and res.get('data', {}).get('id') == rec_id, f"Allocations: {len(res.get('data', {}).get('allocations', []))}")

    # Confirm Recommendation -> Creates Portfolio
    status, res = api_call('POST', f'/recommendations/{rec_id}/confirm', token=access_token)
    record('12. Confirm Recommendation to create Portfolio', status == 200 and 'currentVersion' in res.get('data', {}), f"Version: {res.get('data', {}).get('currentVersion')}")

# --- 6. PORTFOLIO MANAGEMENT ---
status, res = api_call('GET', '/portfolios/current', token=access_token)
portfolio_id = res.get('data', {}).get('id')
record('13. Get Current Portfolio (/portfolios/current)', status == 200 and bool(portfolio_id), f"ID: {portfolio_id}, Status: {res.get('data', {}).get('status')}")

status, res = api_call('GET', '/portfolios/current/performance', token=access_token)
record('14. Get Portfolio Performance (/portfolios/current/performance)', status == 200, f'Status: {status}')

status, res = api_call('GET', '/portfolios/current/versions', token=access_token)
versions_list = res.get('data', []) if isinstance(res.get('data'), list) else res.get('data', {}).get('items', [])
record('15. Get Portfolio Versions (/portfolios/current/versions)', status == 200, f"Versions count: {len(versions_list)}")

# Rebalance Portfolio Recommendation
status, res = api_call('POST', '/portfolios/current/rebalance', token=access_token)
record('16. Request Portfolio Rebalance (/portfolios/current/rebalance)', status in (200, 201) and 'id' in res.get('data', {}), f"New Rec ID: {res.get('data', {}).get('id')}")

# Recalculate Portfolio Recommendation
status, res = api_call('POST', '/portfolios/current/recalculate', token=access_token)
record('17. Request Portfolio Recalculate (/portfolios/current/recalculate)', status in (200, 201) and 'id' in res.get('data', {}), f"New Rec ID: {res.get('data', {}).get('id')}")

# --- 7. STOCKS & MARKET DATA ---
status, res = api_call('GET', '/stocks?page=1&page_size=10', token=access_token)
stocks_data = res.get('data', []) if isinstance(res.get('data'), list) else res.get('data', {}).get('items', [])
record('18. List Stocks (/stocks)', status == 200 and len(stocks_data) > 0, f"Items: {len(stocks_data)}")

status, res = api_call('GET', '/stocks/FPT', token=access_token)
record('19. Get Stock Details (/stocks/FPT)', status == 200 and res.get('data', {}).get('symbol') == 'FPT', f"Company: {res.get('data', {}).get('companyName')}")

status, res = api_call('GET', '/stocks/FPT/history?range=1y&interval=1d', token=access_token)
prices_data = res.get('data', {}).get('prices', [])
record('20. Get Stock History (/stocks/FPT/history)', status == 200 and len(prices_data) > 0, f"Prices count: {len(prices_data)}")

# --- 8. NOTIFICATIONS & AUDIT HISTORY ---
status, res = api_call('GET', '/notifications?page=1&page_size=20', token=access_token)
notif_data = res.get('data', []) if isinstance(res.get('data'), list) else res.get('data', {}).get('items', [])
record('21. List Notifications (/notifications)', status == 200, f"Count: {len(notif_data)}")

status, res = api_call('GET', '/history?page=1&page_size=20', token=access_token)
hist_data = res.get('data', []) if isinstance(res.get('data'), list) else res.get('data', {}).get('items', [])
record('22. List Audit History (/history)', status == 200, f"Count: {len(hist_data)}")

# --- 9. USER SETTINGS & SECURITY ---
status, res = api_call('PATCH', '/users/me', {'fullName': 'Nguyễn Văn Updated'}, token=access_token)
record('23. Update User Profile (/users/me)', status == 200 and res.get('data', {}).get('fullName') == 'Nguyễn Văn Updated', f'Status {status}')

status, res = api_call('PATCH', '/users/me/preferences', {'emailNotifications': False, 'inAppNotifications': True, 'language': 'vi'}, token=access_token)
record('24. Update User Preferences (/users/me/preferences)', status == 200, f'Status {status}')

status, res = api_call('POST', '/auth/change-password', {
    'currentPassword': test_pass,
    'newPassword': 'NewAuditSecret123!'
}, token=access_token)
record('25. Change User Password (/auth/change-password)', status == 200, f'Status {status}')

# Verify login with new password
status, res = api_call('POST', '/auth/login', {'email': test_email, 'password': 'NewAuditSecret123!'})
record('26. Login with New Password', status == 200, f'Status {status}')
if status == 200:
    access_token = res['data']['tokens']['accessToken']
    refresh_token = res['data']['tokens']['refreshToken']

# Logout
status, res = api_call('POST', '/auth/logout', {'refreshToken': refresh_token}, token=access_token)
record('27. User Logout (/auth/logout)', status == 200, f'Status {status}')

# Summary
total = len(results)
passed = sum(1 for r in results if r['success'])
print('=' * 65, flush=True)
print(f'KẾT QUẢ RÀ SOÁT: {passed}/{total} CHỨC NĂNG ĐẠT CHUẨN ({(passed/total)*100:.1f}%)', flush=True)
print('=' * 65, flush=True)
