import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "./adminSideBar";
import { FaTimes } from "react-icons/fa"; // Import the close icon
import { getDatabase, ref, get, set } from "firebase/database"; // Import Firebase functions
import Swal from "sweetalert2"; // Import SweetAlert for pop-up alerts
import "./PublicCourse.css"; // Assuming you have custom styles in a CSS file
import { GoogleGenerativeAI } from "@google/generative-ai";

const PublishCourse = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { fileName, editedContent } = location.state || {};

  const [courseName, setCourseName] = useState(fileName || "");
  const [authorName, setAuthorName] = useState(""); // Added author name state
  const [thumbnail, setThumbnail] = useState("");
  const [bannerImage, setBannerImage] = useState(""); // Added banner image state
  const [createAnnouncement, setCreateAnnouncement] = useState(false);
  const [numQuestions, setNumQuestions] = useState(3); // Default number of questions per module
  const [isProcessing, setIsProcessing] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false); // State to control modal visibility
  const [courseCount, setCourseCount] = useState(0);
  const [updatedContent, setUpdatedContent] = useState(editedContent); // State for updated content

  const API_KEY = "AIzaSyCWc15VkYtEbKsP6J3_8w1WhyPhzV1xpe0"; // Add your actual API key here
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  let generatedCourse;
  const handleGemini = async () => {
    if (isProcessing) return; // Prevent multiple submissions
    setIsProcessing(true);

    try {
      // Generate course content using Gemini API
      const result = await model.generateContent(`
        convert this data into json keep all the data same only convert the data in json.Give only json nothing else. follow this format for converting into json

        module 1
        module title:
        concept:
        Example/Analogy:
        module 2
        module title 2

        Content: ${updatedContent}`);

      const response = await result.response;
      generatedCourse = await response.text();
      generatedCourse = generatedCourse.replace("```json", "");
      generatedCourse = generatedCourse.replace("```", "");

      console.log(generatedCourse);

      // Log the JSON content to the console

      // Show SweetAlert message for course creation
      Swal.fire({
        title: "Course Created!",
        icon: "success",
        position: "top",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      }).then(() => {
        setIsProcessing(false);
      });
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "An error occurred while generating the course.",
        icon: "error",
      });
      console.log(error);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const usercredAd = getCookie("usercredAd"); // Assuming usercredAd is stored as a cookie
    if (usercredAd) {
      fetchCourseCount(usercredAd);
    }
  }, []);

  const getCookie = (name) => {
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)")
    );
    return match ? match[2] : null;
  };

  const fetchCourseCount = async (usercredAd) => {
    const db = getDatabase();
    const courseRef = ref(db, "users/" + usercredAd + "/coursesCount");
    try {
      const snapshot = await get(courseRef);
      if (snapshot.exists()) {
        setCourseCount(snapshot.val());
      } else {
        setCourseCount(0); // If no course count, initialize as 0
      }
    } catch (error) {
      console.error("Error fetching course count:", error);
    }
  };

  const handlePublish = async () => {
    // Check if all required fields are filled
    if (!courseName || !authorName || !thumbnail) {
      alert("Please fill all the required fields!");
      return;
    }

    if (isProcessing) return; // Prevent multiple submissions
    setIsProcessing(true);

    try {
      await handleGemini();
      const usercredAd = getCookie("userSessionCredAd");
      const userSessionCredAd = getCookie("userSessionCredAd"); // Assuming userSessionCredAd is stored as a cookie

      // Fetch the current course count from admin/usersessioncred/coursecount
      const db = getDatabase();
      const courseCountRef = ref(db, `admin/${userSessionCredAd}/courseCount`);
      const snapshot = await get(courseCountRef);

      let currentCourseCount = snapshot.exists() ? snapshot.val() : 0;
      currentCourseCount += 1; // Increment the course count

      // Store the updated course count in admin/usersessioncred/coursecount
      await set(courseCountRef, currentCourseCount);

      // Generate the new course ID
      const newCourseId = `${usercredAd}${currentCourseCount}`;

      // Build the path where the course will be stored
      const coursePath = `admin/${usercredAd}/courses/${userSessionCredAd}${currentCourseCount}`;

      // Store the course data under the new path
      const courseRef = ref(db, coursePath);
      await set(courseRef, {
        courseName,
        authorName,
        thumbnail,
        bannerImage,
        // createAnnouncement,
        numQuestions,
        courseContent: generatedCourse, 
      });

      // Also update the course count in the user's session data
      await set(ref(db, `Courses/${newCourseId}`), {
        courseName,
        authorName,
        thumbnail,
        bannerImage,
        numQuestions,
        courseContent: generatedCourse,
      });
      

      setIsProcessing(false);
      alert("Course Created!");
    } catch (error) {
      setIsProcessing(false);
      alert("Error occurred during course creation");
    }
  };

  const handleShowContent = () => {
    // Show the modal to display course content
    setShowContentModal(true);
  };

  const closeModal = () => {
    setShowContentModal(false);
  };

  const handleContentChange = (event) => {
    setUpdatedContent(event.target.value); // Update content when the user edits
  };

  return (
    <>
      <AdminSidebar />
      <div className="publicCourse-wrapper">
        <div className="form-container">
          <h1>Publish Course</h1>

          {/* Course Name */}
          <div className="input-group">
            <label>
              <strong>Course Name:</strong>
            </label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="Enter course name"
              required
            />
          </div>

          {/* Author Name */}
          <div className="input-group">
            <label>
              <strong>Author Name:</strong>
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Enter author name"
              required
            />
          </div>

          {/* Thumbnail Upload */}
          <div className="input-group">
            <label>
              <strong>Square Thumbnail Image (JPEG Only):</strong>
            </label>
            <input
              type="file"
              accept="image/jpeg"
              onChange={(e) => setThumbnail(e.target.files[0])}
              required
            />
          </div>

          {/* Promotion Banner Image Upload */}
          <div className="input-group">
            <label>
              <strong>Promotion Banner Image (Landscape):</strong>
            </label>
            <input
              type="file"
              accept="image/jpeg"
              onChange={(e) => setBannerImage(e.target.files[0])}
            />
          </div>

          {/* Announcement Checkbox */}
          <div className="checkbox-group">
            <input
              type="checkbox"
              checked={createAnnouncement}
              onChange={(e) => setCreateAnnouncement(e.target.checked)}
            />
            <label>
              <strong>Do you want to create a course announcement?</strong>
            </label>
          </div>

          {/* Number of Questions per Module */}
          <div className="input-group">
            <label>
              <strong>Number of Questions per Module:</strong>
            </label>
            <input
              type="number"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Math.max(1, e.target.value))}
              min="1"
              max="10"
            />
          </div>

          {/* Show Course Content Button */}
          <div className="button-group">
            <button
              onClick={() => navigate("/Admin/CreateCourse")}
              className="revert-button"
            >
              Revert to Edit
            </button>
            <button onClick={handleShowContent} className="view-content-button">
              View Course Content
            </button>
            <button
              onClick={handlePublish}
              className="publish-button"
              disabled={isProcessing}
            >
              {isProcessing ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal for Course Content */}
      {showContentModal && (
        <div className="pdf-content-overlay">
          <div className="pdf-content-box">
            <button className="close-button" onClick={closeModal}>
              <FaTimes />
            </button>
            <div className="pdf-content-text">
              <textarea
                value={updatedContent}
                onChange={handleContentChange}
                rows="10"
                cols="50"
              />
              <pre>{updatedContent}</pre>{" "}
              {/* Display and allow editing of course content */}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PublishCourse;
