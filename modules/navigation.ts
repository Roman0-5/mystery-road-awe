export const navigateTo = (viewName: string): void => {
  window.location.hash = viewName;
  // handleHashChange() in app.ts picks this up via the hashchange listener
};
