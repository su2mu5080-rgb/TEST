/* ========================================
  hair salon LUXE - メインスクリプト
  ・ハンバーガーメニューの開閉
  ・固定ヘッダーを考慮したアンカースクロール
  ・スクロール連動ナビハイライト
  ・フォームバリデーション＆送信処理
  ・スクロールフェードインアニメーション
======================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ----------------------------------------
    ハンバーガーメニューの開閉
  ---------------------------------------- */
  const hamburger = document.querySelector('.header__hamburger');
  const nav       = document.querySelector('.header__nav');

  if (hamburger && nav) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('is-open');
      nav.classList.toggle('is-open', isOpen);
      hamburger.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
    });

    /* ナビリンクをタップしたらメニューを閉じる */
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('is-open');
        nav.classList.remove('is-open');
        hamburger.setAttribute('aria-label', 'メニューを開く');
      });
    });
  }

  /* ----------------------------------------
    ヒーローセクションをクリックしたらページ先頭へスクロール
  ---------------------------------------- */
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ----------------------------------------
    固定ヘッダーを考慮したアンカースクロール
    CSS の scroll-behavior: smooth だけでは
    ヘッダー分のオフセットが取れないため JS で制御する
  ---------------------------------------- */
  const HEADER_HEIGHT = document.querySelector('.header')?.offsetHeight ?? 72;

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      /* ロゴ（#top）はページ最上部へ */
      if (targetId === '#top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      const top = target.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ----------------------------------------
    スクロール連動ナビハイライト
    現在のスクロール位置に対応するナビリンクをアクティブにする
  ---------------------------------------- */
  const navLinks = document.querySelectorAll('.header__nav-list a[href^="#"]');
  const sections = Array.from(navLinks)
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  function updateNavHighlight() {
    const scrollY = window.scrollY + HEADER_HEIGHT + 8;

    /* スクロールがいずれのセクションにも届いていない場合は null のままにする */
    let current = null;
    sections.forEach(section => {
      if (section.offsetTop <= scrollY) current = section;
    });

    navLinks.forEach(link => {
      const isActive = current && link.getAttribute('href') === `#${current.id}`;
      link.style.color = isActive ? 'var(--color-gold)' : '';
    });
  }

  window.addEventListener('scroll', updateNavHighlight, { passive: true });
  updateNavHighlight();

  /* ----------------------------------------
    スクロールフェードインアニメーション
    .section-inner, .menu-card, .coupon-card 等を対象に
    IntersectionObserver で表示時にクラスを付与する
  ---------------------------------------- */
  const fadeTargets = document.querySelectorAll([
    '.section-header',
    '.concept__content',
    '.menu-card',
    '.coupon-card',
    '.gallery__item',
    '.staff-card',
    '.review-card',
    '.access__content',
    '.reservation-form',
  ].join(','));

  /* CSS アニメーション用のスタイルを動的に追加 */
  const fadeStyle = document.createElement('style');
  fadeStyle.textContent = `
    .fade-hidden {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.7s ease, transform 0.7s ease;
    }
    .fade-visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(fadeStyle);

  fadeTargets.forEach(el => el.classList.add('fade-hidden'));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-visible');
        observer.unobserve(entry.target); /* 一度表示したら監視解除 */
      }
    });
  }, { threshold: 0.1 });

  fadeTargets.forEach(el => observer.observe(el));

  /* ----------------------------------------
    フォームバリデーション＆送信処理
  ---------------------------------------- */
  const form = document.getElementById('reservation-form');
  if (!form) return;

  /* バリデーションルール定義 */
  const RULES = {
    name: {
      required: true,
      message: {
        required: 'お名前を入力してください。',
      },
    },
    phone: {
      required: true,
      pattern: /^[\d\-\+\(\)\s]{10,15}$/,
      message: {
        required: '電話番号を入力してください。',
        pattern:  '正しい電話番号を入力してください（例：090-0000-0000）。',
      },
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: {
        required: 'メールアドレスを入力してください。',
        pattern:  '正しいメールアドレスを入力してください。',
      },
    },
    date: {
      required: true,
      message: {
        required: 'ご希望日時を選択してください。',
      },
    },
  };

  /* 単一フィールドのバリデーション。エラーメッセージを返す（問題なければ空文字） */
  function validateField(name, value) {
    const rule = RULES[name];
    if (!rule) return '';

    if (rule.required && !value.trim()) return rule.message.required;
    if (rule.pattern && value.trim() && !rule.pattern.test(value.trim())) return rule.message.pattern;
    return '';
  }

  /* エラー表示の更新 */
  function showError(name, message) {
    const input = form.querySelector(`#${name}`);
    const errorEl = form.querySelector(`#${name}-error`);
    if (!input || !errorEl) return;

    errorEl.textContent = message;
    input.classList.toggle('is-error', !!message);
  }

  /* リアルタイムバリデーション（フォーカスが外れたとき） */
  Object.keys(RULES).forEach(name => {
    const input = form.querySelector(`#${name}`);
    if (!input) return;

    input.addEventListener('blur', () => {
      showError(name, validateField(name, input.value));
    });

    /* 入力中はエラーを消す */
    input.addEventListener('input', () => {
      if (input.classList.contains('is-error')) {
        showError(name, '');
      }
    });
  });

  /* フォーム送信処理 */
  form.addEventListener('submit', e => {
    e.preventDefault();

    /* 全フィールドを検証 */
    let hasError = false;
    Object.keys(RULES).forEach(name => {
      const input = form.querySelector(`#${name}`);
      if (!input) return;

      const message = validateField(name, input.value);
      showError(name, message);
      if (message) hasError = true;
    });

    if (hasError) {
      /* 最初のエラーフィールドへスクロール */
      const firstError = form.querySelector('.is-error');
      if (firstError) {
        const top = firstError.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT - 24;
        window.scrollTo({ top, behavior: 'smooth' });
      }
      return;
    }

    /* 送信ボタンを無効化してローディング表示 */
    const submitBtn = form.querySelector('[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';

    /*
      実際のバックエンド連携時はここを fetch() に置き換える。
      現時点では 1.5 秒後に完了演出を表示する。
    */
    setTimeout(() => {
      form.style.display = 'none';

      /* 送信完了メッセージを生成して表示 */
      const success = document.createElement('div');
      success.className = 'form-success is-visible';
      success.innerHTML = `
        <p class="form-success__title">Thank you</p>
        <p class="form-success__text">
          お問い合わせありがとうございます。<br>
          内容を確認の上、2営業日以内にご連絡いたします。
        </p>
      `;
      form.parentNode.insertBefore(success, form.nextSibling);

      /* 完了メッセージへスクロール */
      const top = success.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT - 24;
      window.scrollTo({ top, behavior: 'smooth' });
    }, 1500);
  });

});
