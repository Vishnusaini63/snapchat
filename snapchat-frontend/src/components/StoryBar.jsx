import React from "react";

// StoryBar = Snapchat Stories section (right side)
const StoryBar = () => {
  const stories = ["User1", "User2", "User3", "User4"];

  return (
    <div className="story-bar">
      <h2>Stories</h2>

      {/* Story list */}
      {stories.map((story, index) => (
        <div className="story-item" key={index}>
          
          {/* Story circle (like Snapchat) */}
          <div className="story-circle"></div>

          {/* Username */}
          <p>{story}</p>

        </div>
      ))}
    </div>
  );
};

export default StoryBar;