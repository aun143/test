const { userModel } = require("../models/usersModel");
const { hashPassword, generarteToken } = require("../helpers/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

const createUser = async (req, res) => {
  try {
    const reqData = req.body;
    const requiredFields = ['username', 'password'];

    for (const field of requiredFields) {
      if (!reqData[field]) {
        return res.status(400).json({ type: "bad", message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required` });
      }
    }
    if (!/^[a-z A-Z]+$/.test(reqData.username)) {
      return res.status(400).json({ type: "bad", message: "Username must contain only letters from A-Z and a-z no space allow" });
    }

    if (reqData.password.length < 8 || !/^[a-zA-Z0-9!@#$%^&*]+$/.test(reqData.password)) {
      return res.status(400).json({ type: "bad", message: "Password must be at least 8 characters long and contain only letters from A-Z and a-z, digits from 0-9, and special characters" });
    }

    if (!isValidEmail(reqData.email)) {
      return res.status(400).json({ type: "bad", message: "Email must be valid and contain '@' " });
    }

    if (reqData.password) {
      reqData.password = await hashPassword(reqData.password);
    }
    const user = await userModel.findOne({ email: reqData.email });

    if (!user) {
      const data = await userModel.create(reqData);
      // Generate token upon successful account creation
      const token = generarteToken(data);
      return res.status(200).json({
        type: "success",
        message: `Account created successfully`,
        data: { data, access_token: token },
      });
    }

    return res
      .status(404)
      .json({ type: "bad", message: `email already exist!` });
  } catch (error) {
    throw error;
  }
};

function isValidEmail(email) {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
}

const LoginUser = async (req, res) => {
  try {
    const reqData = req.body;
    if (!reqData || !reqData.password || reqData.password.length < 8 || !/^[a-zA-Z0-9!@#$%^&*]+$/.test(reqData.password)) {
      return res.status(400).json({ type: "bad", message: "Password must be at least 8 characters long and contain only letters from A-Z and a-z, digits from 0-9, and special characters" });
    }

    if (!isValidEmail(reqData.email)) {
      return res.status(400).json({ type: "bad", message: "Email must be valid and contain '@' " });
    }
    const user = await userModel.findOne({ email: reqData.email });

    if (!user) {
      return res.status(404).json({ type: "bad", message: `Invalid email ` });
    }

    const isPasswordValid = await comparePassword(reqData.password, user.password);

    if (!isPasswordValid) {
      return res.status(404).json({ type: "bad", message: `Invalid  password!` });
    }
    const account = JSON.parse(JSON.stringify(user));
    const token = generarteToken(user);

    return res.status(200).json({
      type: "success",
      message: `Account Login successful`,
      data: { ...account, access_token: token },
    });
  } catch (error) {
    throw error;
  }
};

function isValidEmail(email) {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
}

const forgotPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (newPassword.length < 8 || !/^[a-zA-Z0-9!@#$%^&*]+$/.test(newPassword)) {
      return res.status(400).json({ type: "bad", message: "New password must be at least 8 characters long and contain only letters from A-Z and a-z, digits from 0-9, and special characters" });
    }
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }
    // if (!isValidEmail(res.status.email)) {
    //   return res.status(400).json({ type: "bad", message: "Email must be valid and contain '@' " });
    // }

    const newPasswordhashed = await bcrypt.hash(newPassword, 10);
    user.password = newPasswordhashed;
    await user.save();
    return res.status(200).json({ message: "Password updated successfully", newPassword, newPasswordhashed });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getAllUser = async (req, res) => {
  try {
    const records = await userModel.find();

    res.status(200).send(records);
    //console.log("Get All User", records);
  } catch (error) {
    res.status(500).send({
      message:
        error.message || "Some error occurred while retrieving   ALl User.",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = req.user;

    const records = await userModel
      .findById(user._id)
      .populate("individualProfile organizationProfile");

    res.status(200).send(records);
    //console.log("Get All User", records);
  } catch (error) {
    res.status(500).send({
      message:
        error.message || "Some error occurred while retrieving   ALl User.",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const recordId = req.params.id;
    const deletedRecord = await userModel.findByIdAndDelete(recordId);

    if (!deletedRecord) {
      return res.status(404).json({ message: "The record you're trying to delete does not exist." });
    }

    return res.status(200).json({ message: "Successfully deleted record of the user",recordId });
  } catch (error) {
    res.status(500).json({
      message: error.message || "An error occurred while deleting the record.",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    if (!/^[a-z A-Z]+$/.test(req.body.username)) {
      return res.status(400).json({ type: "bad", message: "Username must contain only letters from A-Z and a-z no space allow" });
    }

    if (req.body.password.length < 8 || !/^[a-zA-Z0-9!@#$%^&*]+$/.test(req.body.password)) {
      return res.status(400).json({ type: "bad", message: "Password must be at least 8 characters long and contain only letters from A-Z and a-z, digits from 0-9, and special characters" });
    }

    if (!isValidEmail(req.body.email)) {
      return res.status(400).json({ type: "bad", message: "Email must be valid and contain '@' " });
    }
    if (req.body.password) {
      req.body.password = await hashPassword(req.body.password);
    }
    const recordId = req.params.id;
    const updateData = req.body;

    const updatedRecord = await userModel.findByIdAndUpdate(
      recordId,
      updateData,
      { new: true }
    );

    if (!updatedRecord) {
      return res.status(404).send({ message: "Record not found for update." });
    }

    res.status(200).send(updatedRecord);
    //console.log("Updated Record", updatedRecord);
  } catch (error) {
    res.status(500).send({
      message:
        error.message || "Some error occurred while updating the User profile.",
    });
  }
};

module.exports = {
  createUser,
  LoginUser,
  forgotPassword,
  getAllUser,
  getProfile,
  deleteUser,
  updateUser,
};
