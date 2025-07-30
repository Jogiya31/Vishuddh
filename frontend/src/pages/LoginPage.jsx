import  { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaLock, FaEnvelope, FaEyeSlash, FaEye } from "react-icons/fa";
import CLogo from "../assets/prayasLogo_new.svg";
import { useReportType } from "./ReportType";
import background from "../assets/Back.webp"

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setLoggedIn, setUserName, loggedIn } = useReportType();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (loggedIn) {
      navigate("/home");
    }
  }, [loggedIn, navigate]);

  const validateEmail = (email) => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  };

  const validatePassword = (password) => {
    const passwordPattern =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordPattern.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    setError("");

    if (!email) {
      setEmailError("Email is required.");
      return;
    } else if (!validateEmail(email)) {
      setEmailError("Invalid email format.");
      return;
    }

    if (!password) {
      setPasswordError("Password is required.");
      return;
    } else if (!validatePassword(password)) {
      setPasswordError(
        "Password must be at least 8 characters, with one uppercase, one lowercase, one number, and one special character."
      );
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      if (data.token) {
        localStorage.setItem("jwtToken", data.access_token);
        if (data.username) {
          setLoggedIn(true);
          localStorage.setItem("userName", data.username);
          localStorage.setItem("loggedIn", true);
          localStorage.setItem("token", data.token);
          setUserName(data.username);
          navigate("/home");
          return { success: true };
        } else {
          throw new Error("User validation failed");
        }
      } else {
        throw new Error("Token not received");
      }
    } catch (error) {
      console.error("Error during login:", error.message);
      setLoggedIn(false);
      localStorage.removeItem("token");
      localStorage.removeItem("userName");
      setError("Invalid credentials. Please try again.");
      return { success: false, error: error.message };
    }
  };

  return !loggedIn ? (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-gray-100 bg-center"
    style={{ 
      backgroundImage: `url(${background})`, 
      backgroundSize: 'cover', 
      backgroundPosition: 'center' 
    }}
  >
      <div className="bg-white shadow-lg rounded-lg p-6 w-96">
        <div className="flex items-center justify-center mb-4">
          <img src={CLogo} alt="Prayas Logo" className="h-16" />
        </div>
        <h2 className="text-center text-xl font-semibold text-gray-800">
          Vishuddh Login
        </h2>
        <form className="mt-4" onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <div className="mb-3">
            <label className="block text-gray-700 text-sm font-medium">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className={`flex items-center border rounded-md px-2 py-1 ${emailError ? "border-red-500" : "border-gray-300"} bg-gray-50`}>
              <FaEnvelope className="text-gray-500" />
              <input type="text" placeholder="Enter your email" className="w-full p-1 outline-none bg-transparent ml-2"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {emailError && <p className="text-red-500 text-sm">{emailError}</p>}
          </div>
         <div className="mb-3">
            <label className="block text-gray-700 text-sm font-medium">
              Password <span className="text-red-500">*</span>
            </label>
            <div className={`flex items-center border rounded-md px-2 py-1 ${passwordError ? "border-red-500" : "border-gray-300"} bg-gray-50`}>
              <FaLock className="text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full p-1 outline-none bg-transparent ml-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="ml-2 focus:outline-none"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
              >
                {showPassword ? <FaEyeSlash className="text-gray-500" /> : <FaEye className="text-gray-500" />}
              </button>
            </div>
            {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition duration-200">
            Login
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-3">
          Forgot password? <a href="#" className="text-blue-600">Reset here</a>
        </p>
      </div>
    </div>
  ) : null;
};

export default LoginPage;
