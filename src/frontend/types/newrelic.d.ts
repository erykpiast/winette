declare global {
  interface Window {
    newrelic?: {
      noticeError(error: Error, customAttributes?: Record<string, any>): void;
      addPageAction(actionName: string, attributes?: Record<string, any>): void;
      setCustomAttribute(name: string, value: string | number | boolean): void;
      finished: boolean;
    };
    NREUM?: any;
  }
}

export {};
