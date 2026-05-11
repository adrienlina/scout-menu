import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.feedbackIntegration({
        autoInject: false,
        colorScheme: "system",
        showBranding: false,
        triggerLabel: "Signaler un bug",
        formTitle: "Signaler un bug",
        submitButtonLabel: "Envoyer",
        cancelButtonLabel: "Annuler",
        confirmButtonLabel: "Confirmer",
        addScreenshotButtonLabel: "Ajouter une capture",
        removeScreenshotButtonLabel: "Retirer la capture",
        nameLabel: "Nom",
        namePlaceholder: "Votre nom",
        emailLabel: "Email",
        emailPlaceholder: "vous@exemple.com",
        messageLabel: "Description",
        messagePlaceholder: "Que s'est-il passé ?",
        successMessageText: "Merci pour votre retour !",
        isRequiredLabel: "(obligatoire)",
      }),
    ],
    tracesSampleRate: 0.1,
  });
}

export function openBugReport() {
  const feedback = Sentry.getFeedback();
  if (!feedback) {
    window.open(
      "mailto:?subject=Bug%20ScoutMenu&body=" +
        encodeURIComponent(`URL: ${window.location.href}\n\nDécrivez le problème:\n`),
    );
    return;
  }
  feedback.createForm().then((form) => {
    form.appendToDom();
    form.open();
  });
}

export function setSentryUser(user: { id: string; email?: string } | null) {
  if (!dsn) return;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}
