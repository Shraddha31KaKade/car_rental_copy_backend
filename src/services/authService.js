const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const registerUser = async (data) => {
  const { name, email, password } = data;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword
    }
  });

  return user;
};

const loginUser = async ({ email, password }) => {

  console.log("Login attempt:", email);

  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw new Error("User not found");
  }

  console.log("User found:", user.email);

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    throw new Error("Invalid password");
  }

  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return { user, token };
};
module.exports = {
  registerUser,
  loginUser
};