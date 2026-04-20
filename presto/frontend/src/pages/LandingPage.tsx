import { Link } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  return (
    <main className="landing">
      <section className="landing__hero">
        <h1 className="landing__title">
          <span aria-hidden="true"></span> Presto
        </h1>
        <p className="landing__tagline">
          The best way to build presentations.
        </p>

        <nav className="landing__actions" aria-label="Get started">
          <Link to="/login" className="landing__btn landing__btn--primary">
            Login
          </Link>
          <Link to="/register" className="landing__btn landing__btn--secondary">
            Register
          </Link>
        </nav>
      </section>
    </main>
  );
}

export default LandingPage;