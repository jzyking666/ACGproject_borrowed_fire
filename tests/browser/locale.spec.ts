import { test, expect } from '@playwright/test';

test('live UI localises edited labels, restores exact Chinese and preserves form and action state', async ({ page }) => {
  await page.goto('/');
  const actual = await page.evaluate(async () => {
    // Vite serves the same module as the game. Use a detached fixture outside
    // #app so ongoing HUD updates do not affect the observer under test.
    const moduleURL = '/src/locale.ts';
    const { installLocale } = await import(moduleURL);
    const root = document.createElement('section');
    root.innerHTML = '<button data-action="fixture"><kbd>E</kbd> 移动</button><svg><text>冷光</text></svg><input placeholder="存档" aria-label="存档"><textarea placeholder="设置">借火</textarea><p data-localized>界面原文</p><span contenteditable="true">我的存档</span>';
    document.body.append(root);
    const b = root.querySelector('button')!, input = root.querySelector('input')!, area = root.querySelector('textarea')!;
    const text = b.lastChild as Text;
    input.value = '我的档案';
    const l = installLocale(root, 'en');
    const initial = [text.data, root.querySelector('text')!.textContent, input.placeholder, input.value, area.placeholder, area.value, root.querySelector('p')!.textContent, root.querySelector('[contenteditable]')!.textContent];
    // Game code can re-use a DOM node and set a new source string while English is active.
    text.data = ' 旋转';
    input.setAttribute('aria-label', '旋转');
    const appended = document.createElement('span');
    appended.title = '存档';
    appended.textContent = '借火';
    root.append(appended);
    await new Promise<void>(done => queueMicrotask(done));
    const changed = [text.data, input.getAttribute('aria-label'), appended.title, appended.textContent];
    l.set('zh-CN');
    const restored = [text.data, input.getAttribute('aria-label'), appended.title, appended.textContent, root.querySelector('text')!.textContent, b.dataset.action];
    l.set('en');
    l.disconnect(); root.remove();
    return {initial, changed, restored};
  });
  expect(actual.initial).toEqual([' Move', 'Cool light', 'Saves', '我的档案', 'Settings', '借火', '界面原文', '我的存档']);
  expect(actual.changed).toEqual([' Rotate', 'Rotate', 'Saves', 'Borrowed Fire']);
  expect(actual.restored).toEqual([' 旋转', '旋转', '存档', '借火', '冷光', 'fixture']);
});
