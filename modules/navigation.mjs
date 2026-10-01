export const navigateTo = (viewName) => {
  window.location.hash = viewName;
  // handleHashChange() in app.js picks this up via the hashchange listener
};
