import React from "react";

/** Ловит ошибки рендера и показывает текст вместо белого экрана */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const msg = String(this.state.error?.message ?? this.state.error);
      return (
        <div className="min-h-screen bg-rose-50 px-4 py-8 text-rose-950">
          <div className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold">Что-то пошло не так</h1>
            <p className="mt-2 text-sm text-slate-600">
              Приложение столкнулось с ошибкой отображения. Это не связано с сервером — чаще всего помогает обновить
              страницу.
            </p>
            <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-800">
              {msg}
            </pre>
            <p className="mt-4 text-sm text-slate-600">
              Если ошибка повторяется, откройте консоль браузера (F12 → Console) и пришлите текст разработчику.
            </p>
            <button
              type="button"
              className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
              onClick={() => window.location.reload()}
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
