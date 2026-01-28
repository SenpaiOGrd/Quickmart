import React, { useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { useLocation } from 'react-router-dom';

const Loading = () => {

    const {navigate, axios} = useAppContext();
    let {search} = useLocation();
    const query = new URLSearchParams(search);
    const nextUrl = query.get('next');
    const sessionId = query.get('session_id');


    useEffect(() => {
        const targetPath = nextUrl ? (nextUrl.startsWith('/') ? nextUrl : `/${nextUrl}`) : '/';

        const run = async () => {
            try{
                if(sessionId){
                    await axios.get(`/api/order/verify-stripe?session_id=${encodeURIComponent(sessionId)}`);
                }
            }finally{
                // keep a small delay so the spinner isn't a flash
                setTimeout(() => navigate(targetPath), 5000);
            }
        };

        run();
    }, [nextUrl, sessionId, navigate, axios]);


  return (
    <div className='flex justify-center items-center h-screen'>
        <div className='animate-spin rounded-full h-24 w-24 border-4  border-gray-300 border-t-primary'></div>
    </div>
  )
}

export default Loading