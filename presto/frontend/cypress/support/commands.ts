/// <reference types="cypress" />

/**
 * Custom Cypress commands to keep test files focused on intent rather
 * than on the mechanics of filling in forms.
 */

export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Register a fresh admin account and land on the dashboard. */
      registerAdmin(name: string, email: string, password: string): Chainable<void>;
      /** Login as an existing admin and land on the dashboard. */
      loginAdmin(email: string, password: string): Chainable<void>;
      /** Logout from the dashboard and land on the landing page. */
      logout(): Chainable<void>;
      /** Create a presentation from the dashboard and land on the edit page. */
      createPresentation(name: string, description?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('registerAdmin', (name: string, email: string, password: string) => {
  cy.visit('/register');
  cy.wait(500);
  cy.get('#register-name').type(name);
  cy.get('#register-email').type(email);
  cy.get('#register-password').type(password);
  cy.get('#register-confirm-password').type(password);
  cy.get('.register__btn').click();
  cy.url({ timeout: 10000 }).should('include', '/dashboard');
  cy.wait(1000);
});

Cypress.Commands.add('loginAdmin', (email: string, password: string) => {
  cy.visit('/login');
  cy.wait(500);
  cy.get('#login-email').type(email);
  cy.get('#login-password').type(password);
  cy.get('.login__btn').click();
  cy.url({ timeout: 10000 }).should('include', '/dashboard');
  cy.wait(1000);
});

Cypress.Commands.add('logout', () => {
  cy.get('.dashboard__logout-btn').click();
  cy.url({ timeout: 10000 }).should('not.include', '/dashboard');
  cy.wait(500);
});

Cypress.Commands.add('createPresentation', (name: string, description?: string) => {
  cy.get('.dashboard__new-btn').click();
  cy.wait(500);
  cy.get('#pres-name').type(name);
  if (description) {
    cy.get('#pres-desc').type(description);
  }
  cy.get('.modal__btn--create').click();
  cy.wait(1000);
  // Card should now be visible on the dashboard
  cy.contains('.dashboard__card-name', name).should('be.visible');
});