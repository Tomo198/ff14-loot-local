import { test, expect } from '@playwright/test';

const key = 'ff14LootDataLocal_Manager';
const backup = name => ({ members: Array.from({ length: 8 }, (_, i) => ({ id: `member-${i}`, name: i === 0 ? name : `Dummy ${i}`, job: '', wants: { weapon: i === 0 }, gets: { weapon: i === 0 ? 2 : 0 } })), history: [], contentCycle: 3 });
async function seed(page, data = backup('Current')) {
  await page.goto('/');
  await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key, data });
  await page.reload();
}
async function upload(page, data) {
  await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)) });
}
const names = page => page.locator('input[placeholder="名前"]:visible');
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const pageErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
});
test.afterEach(async ({ page }) => { expect(pageErrors.get(page)).toEqual([]); });

test('member edits and distribution persist after reload', async ({ page }) => {
  await seed(page);
  await names(page).first().fill('Edited dummy');
  const panel = page.locator('div').filter({ has: page.getByRole('heading', { name: 'ドロップ品を分配する', exact: true }) }).filter({ has: page.getByRole('button', { name: '分配確定', exact: true }) }).last();
  await panel.locator('select:visible').last().selectOption('member-0');
  await page.getByRole('button', { name: '分配確定', exact: true }).filter({ visible: true }).click();
  await page.reload();
  await expect(names(page).first()).toHaveValue('Edited dummy');
  const data = await saved(page);
  expect(data.members[0].gets.weapon).toBe(3);
  expect(data.history).toHaveLength(1);
});

test('read refusal shows UI, warning, and performs no automatic write', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Simulated refusal', 'SecurityError'); };
    window.writes = 0;
    Storage.prototype.setItem = () => { window.writes++; };
  });
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('FF14 Loot Manager');
  await expect(page.getByRole('alert')).toContainText('自動保存を停止');
  await names(page).first().fill('Still usable');
  expect(await page.evaluate(() => window.writes)).toBe(0);
});

test('write refusal retains unsaved edits, prior storage, and export works', async ({ page }) => {
  await seed(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Simulated quota', 'QuotaExceededError'); };
  });
  await names(page).first().fill('Unsaved dummy');
  await expect(page.getByRole('alert')).toContainText('保存に失敗');
  expect((await saved(page)).members[0].name).toBe('Current');
  const downloadPromise = page.waitForEvent('download');
  await page.getByTitle('現在のデータをPCに保存する', { exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const parts = [];
  for await (const part of stream) parts.push(part);
  expect(JSON.parse(Buffer.concat(parts).toString()).members[0].name).toBe('Unsaved dummy');
});

test('restore requires confirmation and cancel preserves current data', async ({ page }) => {
  await seed(page);
  await upload(page, backup('Older backup'));
  await expect(page.getByText('バックアップから復元', { exact: true })).toBeVisible();
  expect((await saved(page)).members[0].name).toBe('Current');
  await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
  await expect(names(page).first()).toHaveValue('Current');
  expect((await saved(page)).members[0].name).toBe('Current');
});

test('valid confirmed restore persists and can be reloaded', async ({ page }) => {
  await seed(page);
  await upload(page, backup('Restored dummy'));
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '実行する', exact: true }).click();
  await page.reload();
  await expect(names(page).first()).toHaveValue('Restored dummy');
  expect((await saved(page)).contentCycle).toBe(3);
});

test('failed restore leaves current screen and stored data intact', async ({ page }) => {
  await seed(page);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Simulated refusal', 'SecurityError'); }; });
  await upload(page, backup('Cannot save'));
  await page.getByRole('button', { name: '実行する', exact: true }).click();
  await expect(names(page).first()).toHaveValue('Current');
  await expect(page.getByRole('alert')).toContainText('現在のデータは変更していません');
  expect((await saved(page)).members[0].name).toBe('Current');
});

test('invalid ordinary backup shapes cannot replace current data', async ({ page }) => {
  await seed(page);
  for (const data of ['{ incomplete', { members: {} }, { ...backup('Bad count'), members: [{ name: 'Bad', gets: { weapon: -1 } }] }, { ...backup('Bad history'), history: {} }]) {
    const dialogPromise = page.waitForEvent('dialog');
    await upload(page, data);
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('現在のデータは変更していません');
    await dialog.accept();
    await expect(names(page).first()).toHaveValue('Current');
    expect((await saved(page)).members[0].name).toBe('Current');
  }
});

test('file read failure preserves data', async ({ page }) => {
  await seed(page);
  await page.evaluate(() => {
    FileReader.prototype.readAsText = function() { this.onerror(new ProgressEvent('error')); };
  });
  const dialogPromise = page.waitForEvent('dialog');
  await Promise.all([
    upload(page, backup('Unreadable')),
    dialogPromise.then(async dialog => {
      expect(dialog.message()).toContain('現在のデータは変更していません');
      await dialog.accept();
    }),
  ]);
  await expect(names(page).first()).toHaveValue('Current');
});

for (const width of [390, 1100]) {
  test(`help is reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    if (width < 1024) await page.getByRole('button', { name: 'ヘルプ', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'ロット管理ツールの使い方', exact: true }).filter({ visible: true })).toBeVisible();
    await page.screenshot({ path: `../loot-help-${width}.png`, fullPage: true });
  });
}
