declare global {
  interface Window {
    Bancard?: {
      Checkout: {
        createForm: (
          containerId: string,
          processId: string,
          options?: Record<string, unknown>,
        ) => void;
      };
      Cards: {
        createForm: (
          containerId: string,
          processId: string,
          styles?: Record<string, unknown>,
        ) => void;
      };
    };
  }
}

export {};
