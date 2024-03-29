require('dotenv').config();
const { User, Expert } = require('../../../model');
const { getUser } = require('../../../responseModel/user');
const {
	driveService,
} = require('../../../utils/googleServices/googleDriveService');
const {
	uploadFile,
	getFolder,
} = require('../../../utils/googleServices/functionality');
const fs = require('fs');

module.exports.reqExpert = async (req) => {
	try {
		const {
			files: files,
			user: { _id },
			body: {
				catagories,
				hourlyRate,
				expertBio,
				daysOfWork,
				fromTime,
				toTime,
				fromDate,
				toDate,
			},
		} = req;
		const availableHours = { daysOfWork, fromTime, toTime, fromDate, toDate };
		// return { code: 0, message: 'blu', data: req.body };
		const user = await User.findOne({
			_id,
			isDeleted: false,
			// isExpert: false,
		}).populate('expertId');
		
		// return { code: 0, message: 'test population', data: user };
		if (!user) {
			return { code: 1, message: 'user.notFoundUser' };
		}

		if (!files) return { code: 1, message: 'user.notFoundFile' };

		const folder = await getFolder('expertReq');
		const upFiles = await Promise.all(
			files.map(async (file) => uploadFile(file, folder))
		);

		const expertDocs = upFiles.map((upFile) => upFile);
		let expert;
		if (user.expertId) {
			expert = await Expert.findOne({ _id: user.expertId });
			expert.expertDocs.push(...expertDocs); // need to be tested
			expert.status = 'pending';
			expert.catagories = catagories;
			expert.hourlyRate = hourlyRate;
			// expert.expertBio = expertBio;
			(user.bio = expertBio), (expert.availableHours = availableHours);
			await user.save();
			await expert.save();
			// await user.populate('expertId');
			// console.log(user);
		} else {
			expert = await Expert.create({
				user: _id,
				expertDocs,
				status: 'pending',
				catagories,
				hourlyRate,
				availableHours,
			});
			user.expertId = expert._id;
			user.bio = expertBio;
			await user.save();
		}
		await user.save({ sendExpertRequest: true });

		//delete files after upload
		files.map((file) => fs.unlinkSync(file.path));

		return {
			code: 0,
			message: 'commonSuccess.message',
			data: { user: await getUser(user) },
		};
	} catch (error) {
		console.log(error);
		throw new Error(error);
	}
};

module.exports.getAllExperts = async (data) => {
	try {
		// filter by categorize
		/// sort by salary , rate ,  maybe number of sessions they made before !?

		let { search, filter, sort, offset, limit } = data;

		limit = limit ? parseInt(limit) : 10;
		offset = offset ? parseInt(offset) : 0;

		/* to handle sort input */
		//
		if (sort && sort[0] == '-') {
			sort = { [sort.slice(1)]: -1 };
		} else if (sort) {
			sort = { [sort]: 1 };
		} else sort = { createdAt: -1 };

		let query = {
			'user.isDeleted': false,
			'user.isBlocked': false,
			status: 'approved',
		};

		if (filter) {
			query.catagories = { $in: Array.isArray(filter) ? filter : [filter] };
		}

		if (search) {
			const regex = new RegExp(search, 'i');
			query.$or = [
				{ hourRate: regex },
				{ availableHours: regex },
				{ expertRate: regex },
				{ fields: regex },
				{ bio: regex },
				{ status: regex },
				{ 'user.name': regex },
				{ 'user.email': regex },
				{ 'user.phone': regex },
			];
		}
		// console.log(query);
		let experts = await Expert.aggregate([
			{
				$lookup: {
					from: 'users',
					localField: 'user',
					foreignField: '_id',
					as: 'user',
				},
			},
			{
				$unwind: {
					path: '$user',
					preserveNullAndEmptyArrays: true,
				},
			},

			{
				$match: {
					...query,
				},
			},

			{
				$project: {
					user: {
						password: 0,
						expertId: 0,
					},
				},
			},

			{
				$sort: sort,
			},
			{
				$skip: parseInt(offset),
			},
			{
				$limit: parseInt(limit),
			},
		]);

		const count = await Expert.aggregate([
			{
				$lookup: {
					from: 'users',
					localField: 'user',
					foreignField: '_id',
					as: 'user',
				},
			},
			{
				$unwind: {
					path: '$user',
					preserveNullAndEmptyArrays: true,
				},
			},
			{ $match: { ...query } },
			{ $count: 'count' },
		]);

		// console.log(experts);
		if (!experts) {
			return { code: 1, message: 'Expert not found ', data: null };
		}
		return {
			code: 0,
			message: 'Experts info',
			data: { count, experts },
		};
	} catch (error) {
		console.log(error);
		throw new Error(error);
	}
};

module.exports.getExpert = async (expertId) => {
	try {
		const expert = await Expert.findOne({
			_id: expertId,
			isDeleted: false,
		}).populate('user');
		if (!expert) {
			return { code: 1, message: 'Expert not found', data: null };
		}
		return { code: 0, message: `expert is ${expert.status}`, data: expert };
	} catch (error) {
		throw new Error(error);
	}
};
