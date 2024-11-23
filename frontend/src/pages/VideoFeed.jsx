// import React from 'react';

// const VideoFeed = () => {
//     return (
//         <div>
//             <h1>People Detection</h1>
//             <img src="http://localhost:5001/video_feed" alt="Video Feed" />
//         </div>
//     );
// };

// export default VideoFeed;

import React from 'react';

const VideoFeed = () => {
    return (
        <div>
            <h2 className='text-2xl font-bold mb-4 text-green-400'>Live Crowd Counting</h2>
            <img src="http://localhost:5001/video_feed" alt="Video Feed" className="rounded-lg shadow-lg" />
        </div>
    );
};

export default VideoFeed;
