import type { defaultLanguage, supportedLanguages } from "../i18n";

export type SupportedLanguage = (typeof supportedLanguages)[number];
export type DefaultLanguage = typeof defaultLanguage;

export interface TranslationResources {
  brand: {
    name: string;
    tagline: string;
  };
  hero: {
    title: string;
    description: string;
  };
  test: {
    title: string;
    description: string;
    fetchButton: string;
    postTitle: string;
    userId: string;
  };
  phase1: {
    title: string;
    subtitle: string;
    features: {
      projectSetup: string;
      reactQuery: string;
      errorBoundaries: string;
      inputForm: string;
      styleSelection: string;
      labelPreview: string;
      exportFunctionality: string;
    };
  };
  loading: {
    title: string;
    description: string;
  };
  error: {
    title: string;
    tryAgain: string;
    detailsTitle: string;
  };
  footer: {
    copyright: string;
  };
  api: {
    fetchError: string;
  };
}

declare module "react-i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: TranslationResources;
    };
  }
}
