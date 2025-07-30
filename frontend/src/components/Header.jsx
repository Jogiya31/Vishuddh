import Navbar from "../components/menu";
import VishuddhLogo from "../assets/logo3.png"
function Header() {
  return (
  <div className="fixed w-full  left-0 right-0 z-[20] text-left mt-[52px] ">
      <div className="h-[45px] bg-[#4059ad] text-white flex items-center justify-center rounded-lg shadow-lg">
      <div className="flex justify-between items-center w-full px-4">
        <h1 className="text-l w-1/4 font-semibold">
        <img
          src={VishuddhLogo}
          alt="Vishuddh"
          className="img-fluid max-h-10 max-w-full object-contain"
          style={{ maxWidth: "100%", height: "auto" }}
        />
        </h1>
        <Navbar />
      </div>
    </div>
   <p className="text-[#d63230] bg-white  font-medium text-[12px] pt-[1px] text-end"><span className="text-black font-black">*</span>To view/compare past data, please check historical report</p>
  </div>
  );
}

export default Header;
