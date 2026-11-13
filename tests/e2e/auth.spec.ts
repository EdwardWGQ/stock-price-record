import { test, expect, type Page } from '@playwright/test';

const user = { id: '11111111-1111-4111-8111-111111111111', email: 'browser-test@example.com', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-11-13T00:00:00Z' };
const session = { user, access_token: 'browser-test-access-token', refresh_token: 'browser-test-refresh-token', expires_in: 3600, token_type: 'bearer' };
async function emptyWorkspace(page: Page) {
  await page.route('https://test-project.supabase.co/rest/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith('/admin_status') ? false : path.endsWith('/monitor_workspace') ? { watchlist: [], trades: [], profile: null, quotes: {}, histories: {}, volatility: {} } : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('**/functions/v1/market-data', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"MARKET_UNAVAILABLE"}' }));
}

test('registration waits for a six-digit code, restores after reload, and preserves leading zeros', async ({ page }) => {
  await emptyWorkspace(page);
  let signup: Record<string, unknown> | null = null;
  const attempts: Record<string, unknown>[] = [];
  await page.route('https://test-project.supabase.co/auth/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/signup')) {
      signup = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (path.endsWith('/verify')) {
      const body = route.request().postDataJSON(); attempts.push(body);
      return route.fulfill({ status: body.token === '012345' ? 200 : 403, contentType: 'application/json', body: JSON.stringify(body.token === '012345' ? session : { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '创建账户', exact: true }).click();
  await page.getByLabel('邮箱', { exact: true }).fill(user.email);
  await page.getByLabel('密码', { exact: true }).fill('test-password-123');
  await page.getByRole('button', { name: '创建账户', exact: true }).click();
  await expect(page.getByRole('heading', { name: '验证邮箱', exact: true })).toBeVisible();
  expect(signup).toMatchObject({ email: user.email, password: 'test-password-123' });
  await expect(page.getByRole('button', { name: /重新发送验证码/ })).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue(user.email);
  await expect(page.getByRole('heading', { name: '验证邮箱', exact: true })).toBeVisible();
  const input = page.getByLabel('6 位邮箱验证码', { exact: true });
  for (const invalid of ['12345', '12a456']) {
    await input.fill(invalid);
    await page.getByRole('button', { name: '验证验证码', exact: true }).click();
    expect(attempts).toHaveLength(0);
  }
  await input.fill('654321');
  await page.getByRole('button', { name: '验证验证码', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('验证码错误或已过期');
  await input.fill('012345');
  await page.getByRole('button', { name: '验证验证码', exact: true }).click();
  await expect(page.getByRole('button', { name: '退出登录', exact: true })).toBeVisible();
  expect(attempts[1]).toMatchObject({ email: user.email, token: '012345', type: 'email' });
  expect(attempts[1]).not.toHaveProperty('password');
  expect(await page.evaluate(() => sessionStorage.getItem('stock-atlas-pending-email-code'))).toBeNull();
});

test('a fresh browser verifies a recovery code before allowing a new password, including after reload', async ({ page }) => {
  await emptyWorkspace(page);
  let verification: Record<string, unknown> | null = null;
  let newPassword: Record<string, unknown> | null = null;
  await page.route('https://test-project.supabase.co/auth/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/verify')) {
      verification = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
    }
    if (path.endsWith('/user') && route.request().method() === 'PUT') newPassword = route.request().postDataJSON();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '重置密码', exact: true }).click();
  await page.getByRole('button', { name: '已有验证码，直接验证', exact: true }).click();
  await page.getByLabel('邮箱', { exact: true }).fill(user.email);
  await page.getByLabel('6 位邮箱验证码', { exact: true }).fill('012345');
  await page.getByRole('button', { name: '验证验证码', exact: true }).click();
  await expect(page.getByRole('heading', { name: '设置新密码', exact: true })).toBeVisible();
  expect(verification).toMatchObject({ email: user.email, token: '012345', type: 'recovery' });
  expect(newPassword).toBeNull();
  await expect(page.getByRole('button', { name: '退出登录', exact: true })).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '设置新密码', exact: true })).toBeVisible();
  await page.getByLabel('新密码', { exact: true }).fill('new-password-123');
  await page.getByRole('button', { name: '设置新密码', exact: true }).click();
  await expect(page.getByRole('button', { name: '退出登录', exact: true })).toBeVisible();
  expect(newPassword).toMatchObject({ password: 'new-password-123' });
  expect(await page.evaluate(() => sessionStorage.getItem('stock-atlas-password-recovery'))).toBeNull();
});

test('unconfirmed login can resend a registration code without creating another account', async ({ page }) => {
  let resend: Record<string, unknown> | null = null;
  let signupCalls = 0;
  await page.route('https://test-project.supabase.co/auth/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/signup')) signupCalls++;
    if (path.endsWith('/token')) return route.fulfill({ status: 400, contentType: 'application/json', body: '{"code":400,"error_code":"email_not_confirmed","msg":"Email not confirmed"}' });
    if (path.endsWith('/resend')) resend = route.request().postDataJSON();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/');
  await page.getByLabel('邮箱', { exact: true }).fill(user.email);
  await page.getByLabel('密码', { exact: true }).fill('test-password-123');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '验证邮箱', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '重新发送验证码', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('6 位数字验证码已发送');
  expect(resend).toMatchObject({ type: 'signup', email: user.email });
  expect(signupCalls).toBe(0);
  await expect(page.getByRole('button', { name: /重新发送验证码/ })).toBeDisabled();
});

test('password reset sends a recovery email and supports resending from a fresh browser', async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route('https://test-project.supabase.co/auth/v1/**', route => {
    if (new URL(route.request().url()).pathname.endsWith('/recover')) requests.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '重置密码', exact: true }).click();
  await page.getByLabel('邮箱', { exact: true }).fill(user.email);
  await page.getByRole('button', { name: '重置密码', exact: true }).click();
  await expect(page.getByRole('heading', { name: '验证重置密码', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('6 位数字重置验证码');
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ email: user.email });
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await page.getByRole('button', { name: '已有验证码，直接验证', exact: true }).click();
  await page.getByRole('button', { name: '重新发送验证码', exact: true }).click();
  await expect(page.getByRole('button', { name: /重新发送验证码/ })).toBeDisabled();
  expect(requests).toHaveLength(2);
});
