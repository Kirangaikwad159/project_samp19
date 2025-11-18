const userModel = require('../model/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../winston');
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const htmlDocx = require('html-docx-js');
const ExcelJS = require('exceljs');

const createUserSchema = Joi.object({
    firstName: Joi.string().min(3).max(50).required(),
    lastName: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    mobileNumber: Joi.string().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'user') 
});


const create = async (req, res) => {
    try {
        const { firstName, lastName, email, mobileNumber, password, role } = req.body;

        const { error } = createUserSchema.validate({ firstName, lastName, email, mobileNumber, password, role });
        if (error) {
            logger.warn(`Validation failed: ${error.details[0].message}`);
            return res.status(400).json({ message: error.details[0].message });
        }

        const existingUser = await userModel.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const profileImage = req.files?.profileImage?.[0]?.filename || null;
        const document = req.files?.document?.[0]?.filename || null;

        const newUser = await userModel.create({
            firstName,
            lastName,
            email,
            mobileNumber,
            password: hashPassword,
            role,
            profileImage,
            document
        });

        logger.info(`New user created: ${email}`);

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: newUser.id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                mobileNumber: newUser.mobileNumber,
                role: newUser.role,
                profileImage: newUser.profileImage,
                document: newUser.document
            }
        });

    } catch (error) {
        logger.error(`Error creating user: ${error.message}`);
        res.status(500).json({ message: 'Failed to create user', error: error.message });
    }
};



const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, password, mobileNumber, role } = req.body;

    if (!firstName || !lastName || !email || !mobileNumber || !role) {
      return res.status(400).json({ message: "firstName, lastName, email, mobileNumber, and role are required." });
    }

    const user = await userModel.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    user.mobileNumber = mobileNumber;
    user.role = role;

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    if (req.files?.profileImage?.[0]) {
      user.profileImage = req.files.profileImage[0].filename;
    }

    if (req.files?.document?.[0]) {
      user.document = req.files.document[0].filename;
    }

    await user.save();

    res.status(200).json({
      message: 'User updated successfully!',
      user,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findByPk(id);

    if (!user) {
      logger?.warn?.(`Delete failed: User not found. ID: ${id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // ✅ Delete files if they exist
    const deleteFile = (filename) => {
      if (filename) {
        const filePath = path.join(__dirname, '../uploads', filename);
        fs.unlink(filePath, (err) => {
          if (err) {
            logger?.warn?.(`Failed to delete file: ${filePath} - ${err.message}`);
          } else {
            logger?.info?.(`Deleted file: ${filePath}`);
          }
        });
      }
    };

    deleteFile(user.profileImage);
    deleteFile(user.document);

    // ✅ Soft delete by updating status
    user.status = false;
    user.profileImage = null;
    user.document = null;
    await user.save();

    logger?.info?.(`User soft-deleted successfully. ID: ${id}, Email: ${user.email}`);

    return res.status(200).json({
      message: 'User deleted successfully (soft delete + file cleanup)',
      user,
    });
  } catch (error) {
    logger?.error?.(`Failed to delete user ID ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      message: 'Failed to delete user',
      error: error.message,
    });
  }
};

// const getUser = async (req, res) => {
//     try {
//         const {id} = req.params;

//         const user = await userModel.findByPk(id);
//         if (!user){
//             return res.status(404).json({message: 'User not found'});
//         }
//         res.status(200).json({
//             message: 'User id successfully!',
//             user
//         })
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({message: 'Failed to get user', error});
//     }
// };

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const Login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    logger.warn("Validation failed during login", { error: error.details[0].message });
    return res.status(400).json({ message: error.details[0].message });
  }

  const { email, password } = value;

  try {
    const user = await userModel.findOne({ where: { email } });
    if (!user) {
      logger.warn(`Login failed - user not found: ${email}`);
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Login failed - invalid credentials for: ${email}`);
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "5h" }
    );

    res.json({
      message: "Login successful!",
      user: { id: user.id, email: user.email },
      token,
    });
  } catch (error) {
    logger.error("Server error during login", { error: error.message, stack: error.stack });
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const changepassword = async (req, res) => {
    try {
        const {oldPassword, newPassword, confirm_newPassword} = req.body
        const {id} = req.user
        if(!oldPassword || !newPassword || !confirm_newPassword){
            return res.send({"status": "failed", "message": "All Fields are Required"})
        } else{
            if (newPassword !== confirm_newPassword){
                return res.send({"status": "failed", "message": "New Password and Confirm new Password doesn't match"})
            } else{
                const user = await userModel.findByPk(id)
                if (!user){
                    return res.send({"status": "failed", "message": "User not found"})
                }
                const salt = await bcrypt.genSalt(10)
                const isMatch = await bcrypt.compare(oldPassword, user.password);
                if (!isMatch){
                    return res.send({"status": "failed", "message": "Invalid old password"})
                }
                const hash = await bcrypt.hash(newPassword, salt)
                await user.update({
                    password:hash
                })
                res.send({"status": 'success', "message": "Password changed successfully"})
            }
        }
    } catch (error) {
        console.error(error, "something went wrong")
    }
};

const downloadUserPDF = async (req, res) => {
    const { id } = req.params;
    const user = await userModel.findByPk(id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=user_${id}.pdf`);

    doc.pipe(res);
    doc.fontSize(18).text('User Profile', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Name: ${user.firstName} ${user.lastName}`);
    doc.text(`Email: ${user.email}`);
    doc.text(`Mobile: ${user.mobileNumber}`);
    doc.text(`Role: ${user.role}`);
    doc.end();
};

const downloadUserExcel = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await userModel.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('User Data');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Mobile Number', key: 'mobileNumber', width: 20 },
      { header: 'Role', key: 'role', width: 10 },
      { header: 'Status', key: 'status', width: 10 },
    ];

    worksheet.addRow({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      role: user.role,
      status: user.status ? 'Active' : 'Inactive',
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=user_${userId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel Download Error:', err);
    res.status(500).json({ message: 'Failed to download Excel file' });
  }
}

const getAllUser = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const offset = (page - 1) * limit;

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;

    const whereClause = {
      status: true,
      [Op.or]: [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { mobileNumber: { [Op.like]: `%${search}%` } },
      ]
    };

    const { count, rows } = await userModel.findAndCountAll({
      where: search ? whereClause : { status: true },
      offset,
      limit,
      order: [["createdAt", "DESC"]],
    });

    const users = rows.map(user => {
      return {
        ...user.toJSON(),
        profileImage: user.profileImage ? `${baseUrl}/${user.profileImage}` : null,
        document: user.document ? `${baseUrl}/${user.document}` : null,
      };
    });

    res.status(200).json({
      message: 'Users fetched successfully',
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      users,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching users",
      error: error.message,
    });
  }
};


module.exports = {
    create,
    update,
    deleteUser,
    // getUser,
    Login,
    changepassword,
    getAllUser,
    downloadUserPDF,
    downloadUserExcel
    
};