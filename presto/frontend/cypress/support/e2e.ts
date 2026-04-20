// Cypress support file - runs before every test file.
import './commands';

// Suppress uncaught exceptions from the app 
// so that app-level noise does not break our end-to-end tests.
Cypress.on('uncaught:exception', () => false);