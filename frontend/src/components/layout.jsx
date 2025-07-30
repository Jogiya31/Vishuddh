import Header from "./Header";
import Footer from "./Footer";
import Navbar from "./Navbar";

const Layout = ({ children }) => {
  // Creating page layout with header, and footer
  return (
    <div className="wrapper">
      <header className="flex flex-col sticky top-0 z-50">
        <Navbar /> {/* navbar Header */}
        <div className="gap-2 mb-1">
          <Header />
        </div>
      </header>
      <main className="main-container">{children}</main> {/* Main content */}
      <footer>
        <Footer className="" /> {/* Footer */}
      </footer>
    </div>
  );
};

export default Layout;
