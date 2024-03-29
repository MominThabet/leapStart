const bcrypt = require('bcrypt');
const Users = require('../../../model/user');
const Verification = require('../../../model/verify');
// const { randomNumber } = require('../../../utils/helpers');
const jwt = require('../../../utils/jwt');
const {
	sendVerificationCodeEmail,
	sendForgetPasswordCode,
} = require('../../../utils/notifications/email');

module.exports.forgotPassword = async (data) => {
	const { email, req } = data;
	try {
		const user = await Users.findOne({ email, isDeleted: false });

		if (!user) {
			return { code: 1, message: 'user.notFoundUser', data: null };
		}

		const code = '123456';

		let verification = await Verification.findOne({ userId: user._id });
		if (!verification) {
			verification = new Verification({ userId: user._id });
			verification = await verification.save();
		}
		verification.email = email;
		verification.code = code;
		await verification.save();

		await sendForgetPasswordCode(user.email, code);
		return {
			code: 0,
			message: 'commonSuccess.message',
			data: { _id: user._id },
		};
	} catch (error) {
		throw new Error(error);
	}
};

module.exports.verifyPasswordCode = async (data) => {
	try {
		const { verificationCode, _id } = data;
		// console.log({ verificationCode, _id });
		const verification = await Verification.findOne({
			code: verificationCode,
			userId: _id,
		});
		// console.log(verification);
		if (!verification) {
			return { code: 1, message: 'user.InvalidCode' };
		}
		verification.verificationCode = null;
		await verification.save();

		const recoverToken = jwt.createRecoverToken({ _id });

		return {
			code: 0,
			message: 'commonSuccess.message',
			data: { recoverToken },
		};
	} catch (error) {
		console.log(error);
		throw new Error(error);
	}
};

module.exports.recoverPassword = async (data) => {
	const { password, recoverToken } = data;
	const { SALT } = process.env;
	try {
		const { data: token } = jwt.verifyRecoverToken(recoverToken);

		if (!token._id) {
			return { code: 1, message: 'user.invalidToken' };
		}
		let user = await Users.findById({ _id: token._id, isDeleted: false });
		if (!user) {
			return { code: 1, message: 'user.notFoundUser', data: null };
		}
		const salt = await bcrypt.genSalt(Number(SALT));
		const hashedPassword = await bcrypt.hash(password, salt);
		user.password = hashedPassword;
		user = await user.save();

		return {
			code: 0,
			message: 'commonSuccess.message',
		};
	} catch (error) {
		console.log(error);
		return { code: 1, message: 'user.invalidToken' };
	}
};
