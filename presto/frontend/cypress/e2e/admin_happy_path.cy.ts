/**
 *  1. Registers successfully
 *  2. Creates a new presentation successfully
 *  3. Updates the thumbnail and name of the presentation successfully
 *  4. Add some slides in a slideshow deck successfully
 *  5. Switch between slides successfully
 *  6. Delete a presentation successfully
 *  7. Logs out of the application successfully
 *  8. Logs back into the application successfully
 */

describe('Admin happy path', () => {
  const runId = Date.now();
  const admin = {
    name: 'Happy Admin',
    email: `happy.admin.${runId}@presto.test`,
    password: 'HappyPath123!',
  };

  const originalName = 'Quarterly Update';
  const updatedName = 'Quarterly Update (v2)';

  it('completes the full admin happy-path end-to-end', () => {
    // --- 1. Registers successfully --------------------------------------
    cy.visit('/register');
    cy.wait(1000);
    cy.get('.register__title').should('contain.text', 'Register');

    cy.get('#register-name').type(admin.name);
    cy.get('#register-email').type(admin.email);
    cy.get('#register-password').type(admin.password);
    cy.get('#register-confirm-password').type(admin.password);
    cy.get('.register__btn').click();

    cy.url({ timeout: 10000 }).should('include', '/dashboard');
    cy.get('.dashboard__title').should('contain.text', 'Presto');
    cy.wait(1000);

    // --- 2. Creates a new presentation successfully ---------------------
    cy.get('.dashboard__new-btn').click();
    cy.wait(500);
    cy.get('.modal').should('be.visible');
    cy.get('#pres-name').type(originalName);
    cy.get('#pres-desc').type('Happy path presentation');
    cy.get('.modal__btn--create').click();
    cy.wait(1000);

    cy.contains('.dashboard__card-name', originalName).should('be.visible');

    // Navigate into the presentation
    cy.contains('.dashboard__card', originalName).click();
    cy.url({ timeout: 10000 }).should('include', '/presentation/');
    cy.wait(1000);
    cy.get('.edit-pres__title').should('contain.text', originalName);

    // --- 3. Update thumbnail and name of the presentation --------------
    // Update the name via the edit-title button
    cy.get('.edit-pres__edit-title-btn').click();
    cy.wait(500);
    cy.get('#edit-title-input').clear().type(updatedName);
    cy.contains('.modal__btn--create', 'Save').click();
    cy.wait(1000);
    cy.get('.edit-pres__title').should('contain.text', updatedName);

    // Update the thumbnail by uploading a file.  We build a 1x1 PNG on the fly
    // so we don't need to ship a binary fixture.
    const tinyPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNg+M/wHwAEAQH/7yMK/wAAAABJRU5ErkJggg==';
    cy.get('input[type="file"][accept="image/*"]').first().selectFile(
      {
        contents: Cypress.Buffer.from(tinyPng, 'base64'),
        fileName: 'thumb.png',
        mimeType: 'image/png',
      },
      { force: true },
    );
    cy.wait(1500);

    // Verify the thumbnail actually landed on the dashboard
    cy.get('.edit-pres__back-btn').click();
    cy.url({ timeout: 10000 }).should('include', '/dashboard');
    cy.wait(1000);
    cy.contains('.dashboard__card-name', updatedName).should('be.visible');
    cy.contains('.dashboard__card', updatedName)
      .find('img')
      .should('have.attr', 'src')
      .and('include', 'data:image/png');

    // Go back into the presentation to work with slides
    cy.contains('.dashboard__card', updatedName).click();
    cy.url({ timeout: 10000 }).should('include', '/presentation/');
    cy.wait(1000);

    // --- 4. Add some slides in a slideshow deck ------------------------
    // A freshly-created presentation starts with 1 slide.  Add two more.
    cy.get('.edit-pres__add-slide-btn').click();
    cy.wait(1000);
    cy.get('.edit-pres__slide-number').should('contain.text', '2');

    cy.get('.edit-pres__add-slide-btn').click();
    cy.wait(1000);
    cy.get('.edit-pres__slide-number').should('contain.text', '3');

    // --- 5. Switch between slides --------------------------------------
    cy.get('.edit-pres__arrow--left').click();
    cy.wait(1000);
    cy.get('.edit-pres__slide-number').should('contain.text', '2');

    cy.get('.edit-pres__arrow--left').click();
    cy.wait(1000);
    cy.get('.edit-pres__slide-number').should('contain.text', '1');

    cy.get('.edit-pres__arrow--right').click();
    cy.wait(1000);
    cy.get('.edit-pres__slide-number').should('contain.text', '2');

    // --- 6. Delete a presentation --------------------------------------
    cy.get('.edit-pres__delete-btn').click();
    cy.wait(500);
    cy.get('.modal').should('be.visible');
    cy.contains('.modal__btn--danger', 'Yes').click();
    cy.url({ timeout: 10000 }).should('include', '/dashboard');
    cy.wait(1000);
    cy.contains('.dashboard__card-name', updatedName).should('not.exist');

    // --- 7. Logs out of the application --------------------------------
    cy.get('.dashboard__logout-btn').click();
    cy.url({ timeout: 10000 }).should('not.include', '/dashboard');
    cy.wait(1000);
    // Token should have been cleared
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.be.null;
    });

    // --- 8. Logs back into the application -----------------------------
    cy.visit('/login');
    cy.wait(500);
    cy.get('#login-email').type(admin.email);
    cy.get('#login-password').type(admin.password);
    cy.get('.login__btn').click();

    cy.url({ timeout: 10000 }).should('include', '/dashboard');
    cy.get('.dashboard__title').should('contain.text', 'Presto');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.be.a('string').and.not.be.empty;
    });
  });
});