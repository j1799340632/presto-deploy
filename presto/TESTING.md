1. Happy path

admin_happy_path.cy.ts follows the 8 steps from the spec:

- Register - fills the register form, checks we land on /dashboard.
- Create a presentation - opens the modal, submits, and checks the new card appears on the dashboard.
- Update the thumbnail and name - opens the edit-title modal and renames the presentation, then uploads a small PNG as the thumbnail, and checks both changes show up on the dashboard.
- Add slides - clicks + New Slide twice, and checks the slide number goes from 1 to 2 to 3.
- Switch between slides - clicks the left and right arrows and checks the slide number changes.
- Delete the presentation - clicks delete, confirms Yes in the modal, and checks the card is gone from the dashboard.
- Logout - clicks logout and checks the token is removed from localStorage.
- Login again - logs in with the same email and password and checks we are back on the dashboard.

2. Second path

admin_content_path.cy.ts tests features the happy path does not cover:
- Form validation:
- The register form shows an error when passwords don't match.
- The login form shows an error when the fields are empty.
- Both errors can be closed with the ✕ button.
- Adding slide content:
- Add a text element to a slide and check the text shows.
- Add a code element and check the language is detected as PYTHON.
- Slide styling:
- Change the slide background to a solid colour and check the colour is applied.
- Deleting a single slide (not the whole presentation) and checking the remaining slide still has its content.
- Logout and login again to check the data was saved to the backend, not just kept in memory.
