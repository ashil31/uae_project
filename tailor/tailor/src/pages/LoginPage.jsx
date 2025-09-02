import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// Import the Redux actions and selectors
import { loginUser, selectIsAuthenticated, selectAuthStatus, selectAuthError } from '../features/auth/authSlice';

const LoginPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    // Get state from Redux store
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const authStatus = useSelector(selectAuthStatus);
    const authError = useSelector(selectAuthError);

    // Setup react-hook-form
    const { register, handleSubmit, formState: { errors } } = useForm();

    const from = location.state?.from?.pathname || '/dashboard';

    // Redirect if already logged in (this logic is perfect, no changes needed)
    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    // The onSubmit function is now simpler. It just dispatches the action.
    // The slice handles toasts and the useEffect handles redirection.
    const onSubmit = (data) => {
        dispatch(loginUser(data));
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg"
            >
                <div>
                    <h2 className="text-3xl font-extrabold text-center text-gray-900">
                        Login
                    </h2>
                </div>
                {/* Use react-hook-form's handleSubmit */}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                type="email"
                                autoComplete="email"
                                className="appearance-none rounded-none relative block w-full px-3 py-2 my-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                // Register the input with validation
                                {...register('email', { required: 'Email is required' })}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                className="appearance-none rounded-none relative block w-full px-3 py-2 my-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                                // Register the input with validation
                                {...register('password', { required: 'Password is required' })}
                            />
                        </div>
                    </div>

                    {/* Display validation errors */}
                    {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                    {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}

                    <div>
                        <button
                            type="submit"
                            disabled={authStatus === 'loading'}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                        >
                            {authStatus === 'loading' ? <Loader2 className="animate-spin" /> : 'Sign in'}
                        </button>
                    </div>
                </form>

                {/* Display login error from Redux state */}
                {authStatus === 'failed' && authError && (
                    <p className="mt-2 text-sm text-center text-red-600">{authError}</p>
                )}

                <p className="mt-2 text-sm text-center text-gray-600">
                    Don't have an account?{' '}
                    <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Sign up
                    </Link>
                </p>
            </motion.div>
        </div>
    );
};

export default LoginPage;
