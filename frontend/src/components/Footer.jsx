import logo from "../assets/prayas_logo.svg";
import pryaaslogo from "../assets/nic_logo-removebg-preview.png";

const Footer = () => {
  return (
    <footer className="pt-[29px] pb-0 px-0 fixed w-full bottom-0 z-10">
      <div className="w-full px-4 bg-[#4a90e2]">
        <div className="flex items-center justify-between">
          <img
            src={pryaaslogo}
            alt="Vishuddh"
            className="img-fluid max-h-[50px] max-w-full object-contain "
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <div className="font-bold text-white">
            <p className="text-center footer-text">
              Prayas has been developed under the guidance of Prime Minister’s
              office with inputs from Departments.
              <br />
              The Platform is designed and developed by Data Analytics (DA)
              Informatics Division, NIC{" "}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="Vishuddh"
              className="img-fluid max-h-10 max-w-full object-contain"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
