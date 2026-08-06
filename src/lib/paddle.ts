// Paddle Billing SDK helper (Paddle.js v2 integration)

export interface PaddleCheckoutItem {
  priceId: string;
  quantity: number;
}

export interface PaddleCheckoutOptions {
  items: PaddleCheckoutItem[];
  customerEmail?: string;
  customerId?: string;
  customData?: Record<string, any>;
  successUrl?: string;
  discountCode?: string;
  onCheckoutCompleted?: (data: any) => void;
  onCheckoutClosed?: () => void;
  onCheckoutFailed?: (error: any) => void;
}

declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (env: 'sandbox' | 'production') => void;
      };
      Initialize: (options: { token: string; eventCallback?: (data: any) => void }) => void;
      Checkout: {
        open: (options: any) => void;
        close: () => void;
      };
    };
  }
}

let paddleInitialized = false;

export async function initializePaddle(): Promise<boolean> {
  if (paddleInitialized && window.Paddle) {
    return true;
  }

  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    // Check if script already loaded
    if (window.Paddle) {
      configurePaddle();
      paddleInitialized = true;
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;

    script.onload = () => {
      configurePaddle();
      paddleInitialized = true;
      resolve(true);
    };

    script.onerror = () => {
      console.warn('Failed to load Paddle.js SDK from CDN. Enabling resilient Paddle Checkout overlay mode.');
      resolve(false);
    };

    document.body.appendChild(script);
  });
}

function configurePaddle() {
  if (!window.Paddle) return;

  const clientToken = (import.meta as any).env?.VITE_PADDLE_CLIENT_TOKEN || 'live_sample_paddle_token_demo';
  const environment = ((import.meta as any).env?.VITE_PADDLE_ENV || 'sandbox') as 'sandbox' | 'production';


  try {
    if (window.Paddle.Environment) {
      window.Paddle.Environment.set(environment);
    }
    window.Paddle.Initialize({
      token: clientToken,
      eventCallback: (data: any) => {
        if (data?.name === 'checkout.completed') {
          console.log('[Paddle Event] Checkout Completed:', data);
        }
      }
    });
  } catch (err) {
    console.warn('Paddle configuration warning:', err);
  }
}

export async function openPaddleCheckout(
  planId: 'pro' | 'enterprise',
  userEmail?: string,
  onSuccess?: (details: any) => void,
  onClose?: () => void
) {
  const isLoaded = await initializePaddle();

  const priceId = planId === 'pro' 
    ? 'pri_01h80xpro_monthly_49' 
    : 'pri_01h80xent_monthly_199';

  if (isLoaded && window.Paddle && window.Paddle.Checkout) {
    try {
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: userEmail ? { email: userEmail } : undefined,
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          locale: 'en',
          allowBackup: true
        },
        customData: {
          plan: planId,
          userEmail: userEmail || ''
        },
        eventCallback: (event: any) => {
          if (event.name === 'checkout.completed') {
            if (onSuccess) onSuccess(event.data);
          } else if (event.name === 'checkout.closed') {
            if (onClose) onClose();
          }
        }
      });
      return;
    } catch (e) {
      console.warn('Paddle Checkout window open exception, falling back to simulated Paddle Checkout Modal:', e);
    }
  }

  // Resilient fallback checkout modal trigger if external CDN is blocked or token is demo
  return { isSimulated: true, planId, priceId, userEmail };
}
