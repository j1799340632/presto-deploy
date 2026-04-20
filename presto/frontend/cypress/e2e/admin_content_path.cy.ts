/**
 * UI Test: Admin Content-Editing Path
 *
 * A second end-to-end path that deliberately exercises features *not* covered
 * by the happy path.  See TESTING.md for the rationale.
 *
 * Covered here:
 *   - Registration validation (password mismatch) and error banner
 *   - Login validation (empty fields) and error banner
 *   - Successful registration and login
 *   - Adding a text element to a slide
 *   - Adding a code element to a slide
 *   - Changing the slide background (solid colour)
 *   - Deleting an individual slide (not the whole presentation)
 *   - Logging out via header button
 */

describe('Admin content-editing path', () => {
  const runId = Date.now();
  const admin = {
    name: 'Content Admin',
    email: `content.admin.${runId}@presto.test`,
    password: 'ContentPath123!',
  };

  it('validates registration/login forms and edits slide content', () => {
    // --- Registration: password mismatch error -------------------------
    cy.visit('/register');
    cy.wait(1000);
    cy.get('#register-name').type(admin.name);
    cy.get('#register-email').type(admin.email);
    cy.get('#register-password').type(admin.password);
    cy.get('#register-confirm-password').type('DifferentPassword!');
    cy.get('.register__btn').click();
    cy.wait(500);
    cy.get('.register__error').should('be.visible').and('contain.text', 'Passwords do not match');

    // Dismiss the error and register properly
    cy.get('.register__error-close').click();
    cy.get('.register__error').should('not.exist');

    cy.get('#register-confirm-password').clear().type(admin.password);
    cy.get('.register__btn').click();

    cy.url({ timeout: 10000 }).should('include', '/dashboard');
    cy.wait(1000);

    // --- Create a presentation -----------------------------------------
    const presName = 'Content Deck';
    cy.get('.dashboard__new-btn').click();
    cy.wait(500);
    cy.get('#pres-name').type(presName);
    cy.get('.modal__btn--create').click();
    cy.wait(1000);
    cy.contains('.dashboard__card-name', presName).click();
    cy.url({ timeout: 10000 }).should('include', '/presentation/');
    cy.wait(1000);

    // --- Add a text element --------------------------------------------
    cy.contains('.edit-pres__tool-btn', 'Add Text').click();
    cy.wait(500);
    cy.get('.modal').should('be.visible');
    cy.get('#text-content').type('Hello Presto!');
    cy.contains('.modal__btn--create', 'Add').click();
    cy.wait(1000);
    cy.get('.slide-element--text').should('contain.text', 'Hello Presto!');

    // --- Add a code element --------------------------------------------
    cy.contains('.edit-pres__tool-btn', 'Add Code').click();
    cy.wait(500);
    cy.get('.modal').should('be.visible');
    cy.get('#code-content').type('def hello():\n    print("hi")', {
      parseSpecialCharSequences: false,
    });
    cy.contains('.modal__detected-lang', 'PYTHON').should('be.visible');
    cy.contains('.modal__btn--create', 'Add').click();
    cy.wait(1000);
    cy.get('.slide-element--code').should('exist');

    // --- Change the background to a solid colour -----------------------
    cy.contains('.edit-pres__tool-btn', 'Background').click();
    cy.wait(500);
    cy.get('.modal').should('be.visible');
    // Default is solid; just pick a colour and apply.
    cy.get('#bg-color').invoke('val', '#ff0000').trigger('input').trigger('change');
    cy.contains('.modal__btn--create', 'Apply').click();
    cy.wait(1000);
    cy.get('.edit-pres__slide')
      .should('have.attr', 'style')
      .and('match', /rgb\(255,\s*0,\s*0\)|#ff0000/i);

    // --- Add a second slide, then delete it (individual slide deletion) -
    cy.get('.edit-pres__add-slide-btn').click();
    cy.wait(1000);
    cy.get('.edit-pres__slide-number').should('contain.text', '2');

    cy.contains('.edit-pres__delete-slide-btn', 'Delete Slide').click();
    cy.wait(1000);
    cy.get('.edit-pres__slide-number').should('contain.text', '1');

    // Our text & code elements should still be on slide 1
    cy.get('.slide-element--text').should('contain.text', 'Hello Presto!');
    cy.get('.slide-element--code').should('exist');

    // --- Logout via the dashboard header -------------------------------
    cy.get('.edit-pres__back-btn').click();
    cy.url({ timeout: 10000 }).should('include', '/dashboard');
    cy.wait(1000);
    cy.get('.dashboard__logout-btn').click();
    cy.url({ timeout: 10000 }).should('not.include', '/dashboard');
    cy.wait(500);

    // --- Login: empty-fields error -------------------------------------
    cy.visit('/login');
    cy.wait(500);
    cy.get('.login__btn').click();
    cy.wait(500);
    cy.get('.login__error')
      .should('be.visible')
      .and('contain.text', 'Please enter both email and password');

    // Then actually log in
    cy.get('#login-email').type(admin.email);
    cy.get('#login-password').type(admin.password);
    cy.get('.login__btn').click();
    cy.url({ timeout: 10000 }).should('include', '/dashboard');

    // Presentation should still exist after the re-login
    cy.contains('.dashboard__card-name', presName).should('be.visible');
  });
});