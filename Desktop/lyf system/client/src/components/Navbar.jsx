import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react';

const Navbar = () => {
    const { user } = useUser();

    return (
        <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="text-2xl font-bold text-indigo-600">
                            Reality Architect
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        <SignedIn>
                            <Link to="/dashboard" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                                Dashboard
                            </Link>
                            <div className="flex items-center space-x-2 text-gray-700 mr-2">
                                <span className="font-medium">{user?.fullName || user?.firstName}</span>
                            </div>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>
                        <SignedOut>
                            <Link to="/login" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                                Login
                            </Link>
                            <Link
                                to="/signup"
                                className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                            >
                                Sign Up
                            </Link>
                        </SignedOut>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
