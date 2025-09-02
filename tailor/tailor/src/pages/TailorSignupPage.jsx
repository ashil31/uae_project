import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';

// Import the Redux actions and selectors
import { signupUser, selectAuthStatus, selectAuthError } from '../features/auth/authSlice';

const TailorSignupPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Get state from Redux store
    const authStatus = useSelector(selectAuthStatus);
    const authError = useSelector(selectAuthError);

    // Setup react-hook-form
    const { register, handleSubmit, formState: { errors } } = useForm();

    // This function will be called on form submission
    const onSubmit = (data) => {
        dispatch(signupUser(data)).then((result) => {
            // After the thunk is fulfilled, redirect to login
            if (signupUser.fulfilled.match(result)) {
                navigate('/login');
            }
        });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md"
            >
                <h2 className="text-2xl font-bold text-center text-gray-900">Create a Tailor Account</h2>
                
                {/* Use the react-hook-form handleSubmit */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="text-sm font-medium text-gray-700">Username</label>
                        <input
                            type="text"
                            id="username"
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            // Register the input with validation rules
                            {...register('username', { required: 'Username is required' })}
                        />
                        {/* Display validation error */}
                        {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            {...register('email', { 
                                required: 'Email is required',
                                pattern: {
                                    value: /^\S+@\S+$/i,
                                    message: "Invalid email address"
                                }
                            })}
                        />
                        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            {...register('password', { 
                                required: 'Password is required',
                                minLength: {
                                    value: 6,
                                    message: 'Password must be at least 6 characters long'
                                }
                             })}
                        />
                        {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
                    </div>
                    <div>
                        <button
                            type="submit"
                            // Disable button based on Redux loading state
                            disabled={authStatus === 'loading'}
                            className="w-full flex justify-center px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                        >
                            {authStatus === 'loading' ? <Loader2 className="animate-spin" /> : 'Sign Up'}
                        </button>
                    </div>
                </form>

                {/* Display error from Redux state */}
                {authStatus === 'failed' && authError && (
                    <p className="text-sm text-center text-red-600">{authError}</p>
                )}

                <p className="text-sm text-center text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Log in
                    </Link>
                </p>
            </motion.div>
        </div>
    );
};

export default TailorSignupPage;
