import Footer from "../Footer";
import Navbar from "../Navbar";

const SanityLayout = ({ children }) => {
  // Creating page Sanitylayout with header, and footer
  return (
    <div className="wrapper">
      <header>
        <Navbar />
      </header>
      <main style={{ flexGrow: 1 }}>
        {children}
      </main>{" "}
      <footer>
        <Footer />
      </footer>
    </div>
  );
};

export default SanityLayout;
