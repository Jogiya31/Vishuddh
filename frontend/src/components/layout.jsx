import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ children }) => {

  // Creating page layout with sidebar, header, and footer
  return (
    <div className={toggleMenu ? "menu_slide" : ""}>
      <Header /> {/* Header */}
      <div>{children}</div> {/* Main content */}
      <Footer className="" /> {/* Footer */}
    </div>
  );
};

export default Layout;
