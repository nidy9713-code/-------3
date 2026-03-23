const { test, expect } = require('@playwright/test');

/**
 * Тестовые данные (Новый Админ)
 */
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
};

/**
 * Хелпер для входа. Если уже на нужной странице, ничего не делает.
 */
async function ensureLogin(page) {
  await page.goto('/');
  
  // Ждем конца загрузки
  await page.getByText('Загрузка...').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {});

  // Проверяем, залогинены ли мы
  const profileHeading = page.getByRole('heading', { name: 'Параметры здоровья' });
  if (await profileHeading.isVisible()) {
    return;
  }

  // Если видим кнопку "Выйти" на другой странице
  const logoutBtn = page.getByRole('button', { name: 'Выйти' });
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
    await page.getByRole('heading', { name: 'Вход в систему' }).waitFor({ timeout: 15000 });
  }

  // Вход
  await page.getByPlaceholder('example@mail.com').fill(TEST_USER.email);
  await page.getByPlaceholder('••••••••').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'Войти' }).click();

  // Проверка результата
  const errorBanner = page.locator('.bg-rose-50');

  await Promise.race([
    profileHeading.waitFor({ timeout: 30000 }),
    errorBanner.waitFor({ timeout: 30000 })
  ]).catch(() => {
     throw new Error('Таймаут входа: ни профиль, ни ошибка не появились.');
  });

  if (await errorBanner.isVisible()) {
    const text = await errorBanner.innerText();
    throw new Error(`Ошибка входа: ${text}`);
  }

  await expect(profileHeading).toBeVisible();
}

test.describe('Трекер целей - Сценарии тестирования', () => {
  // Выполняем тесты по одному для стабильности
  test.describe.configure({ mode: 'serial' });

  test('1. Пользователь без авторизации не может попасть в ЛК', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Загрузка...').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    // Если сессия осталась от прошлых запусков, разлогинимся
    const logoutBtn = page.getByRole('button', { name: 'Выйти' });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    }
    await expect(page.getByRole('heading', { name: 'Вход в систему' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Профиль' })).not.toBeVisible();
  });

  test('2. Успешный вход в профиль', async ({ page }) => {
    await ensureLogin(page);
    await expect(page.getByRole('button', { name: 'Профиль' })).toHaveClass(/bg-emerald-600/);
  });

  test('3. Валидация пустых полей', async ({ page }) => {
    await ensureLogin(page);
    await page.getByRole('button', { name: 'Питание' }).click();
    await expect(page.getByRole('heading', { name: 'Добавить продукт' })).toBeVisible();
    await page.getByRole('button', { name: 'Добавить' }).click();
    await expect(page.getByText('Заполните поле').first()).toBeVisible({ timeout: 10000 });
  });

  test('4. Добавление данных (Питание, Тренировки, Имя)', async ({ page }) => {
    await ensureLogin(page);

    // Питание
    await page.getByRole('button', { name: 'Питание' }).click();
    const foodName = 'Тест ' + Date.now();
    await page.getByPlaceholder('Напр: Куриная грудка').fill(foodName);
    
    // Точный селектор Ккал (избегаем инпута Цели)
    const caloriesInput = page.locator('div').filter({ hasText: /^Ккал$/ }).locator('input');
    await caloriesInput.fill('100');
    
    await page.getByRole('button', { name: 'Добавить' }).click();
    
    // Ждем очистки полей (признак успеха)
    await expect(page.getByPlaceholder('Напр: Куриная грудка')).toHaveValue('', { timeout: 15000 });
    await expect(page.getByText(foodName)).toBeVisible();

    // Тренировка
    await page.getByRole('button', { name: 'Тренировки' }).click();
    const duration = '45';
    await page.locator('div').filter({ hasText: /^Длительность \(мин\)$/ }).locator('input').fill(duration);
    await page.getByRole('button', { name: 'Добавить' }).click();

    // Проверяем, что нет баннера ошибки (признак сбоя БД или валидации)
    const errorBanner = page.locator('[role="alert"]').filter({ hasText: /Ошибка|Заполните/ });
    if (await errorBanner.isVisible()) {
       const msg = await errorBanner.textContent();
       throw new Error(`Ошибка при добавлении тренировки: ${msg}`);
    }

    // Ждем очистки (увеличен таймаут до 20с)
    await expect(page.locator('div').filter({ hasText: /^Длительность \(мин\)$/ }).locator('input')).toHaveValue('', { timeout: 20000 });
    await expect(page.getByText(`${duration} мин`).first()).toBeVisible();

    // Имя
    await page.getByRole('button', { name: 'Профиль' }).click();
    
    // Если кнопка "Изменить параметры" видна — нажимаем её. 
    // Если мы уже в режиме редактирования (у нового пользователя), сразу переходим к заполнению.
    const editBtn = page.getByRole('button', { name: 'Изменить параметры' });
    if (await editBtn.isVisible()) {
      await editBtn.click();
    }
    
    const newName = 'Робот ' + Math.floor(Math.random() * 100);
    await page.getByPlaceholder('Александр').fill(newName);
    await page.getByRole('button', { name: 'Сохранить профиль' }).click();
    
    // Ждем появления приветствия с новым именем
    await expect(page.getByText(`Привет, ${newName}!`)).toBeVisible({ timeout: 15000 });
  });

  test('5. Удаление записи из списка', async ({ page }) => {
    await ensureLogin(page);
    await page.getByRole('button', { name: 'Питание' }).click();
    
    const foodName = 'Удалить ' + Date.now();
    await page.getByPlaceholder('Напр: Куриная грудка').fill(foodName);
    await page.locator('div').filter({ hasText: /^Ккал$/ }).locator('input').fill('10');
    await page.getByRole('button', { name: 'Добавить' }).click();
    await expect(page.getByText(foodName)).toBeVisible({ timeout: 15000 });

    // Слушаем системное окно подтверждения
    page.once('dialog', d => d.accept());

    // Ищем кнопку удаления в строке, где находится наш текст
    // В UI кнопка видна только при наведении, используем { force: true }
    const entryRow = page.locator('.group').filter({ hasText: foodName }).last();
    await entryRow.getByRole('button', { name: 'Уд.' }).click({ force: true });
    
    // Проверяем, что запись исчезла
    await expect(page.getByText(foodName)).not.toBeVisible({ timeout: 15000 });
  });
});
