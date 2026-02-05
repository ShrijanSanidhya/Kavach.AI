import { SignIn } from '@clerk/clerk-react';
import authBg from '../assets/auth-bg.png';

const LoginPage = () => {
    return (
        <div className="flex h-screen w-full bg-gray-50">
            {/* Left Side - Image */}
            <div className="hidden lg:flex w-1/2 bg-cover bg-center" style={{ backgroundImage: `url(${authBg})` }}>
                <div className="w-full h-full bg-black bg-opacity-10 backdrop-blur-[2px]"></div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <SignIn signUpUrl="/signup" />
            </div>
        </div>
    );
};

export default LoginPage;
