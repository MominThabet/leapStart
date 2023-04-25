const express = require('express');
const controller = require('../../../controller/expert');

const upload = require('../../../../utils/multerUploader');
const { reqExpert } = require('../../../validationSchema/expert');
const { validateRequest } = require('../../../../utils/validation');
const {
	isAuthenticatedVerified,
} = require('../../../../utils/middleware/auth');
const router = express.Router();



/**TODO:
 * in here we define the routes for experts from the side of the user (mainly)
 * in later date we gonna decide if the admin gonna use the same routes or diff ones
 * the routes we gonna create :
 * 1. request verify _ upload files
 * 2. get expert by id ? or is it applied to user // ==> to user
 * 3. get all experts with filter pagination search
 * 4. update expert req ? how to apply it
 * 5. update profile what is acceptable and what's not
 * 6. how is he to check if his req got approved or not
 * 7. notification to get the response to the verify req
 *
 */
// router.post('/');
router.get('/getexperts', controller.getExperts);//isAuthenticatedVerified,
router.post(
	'/',
	upload.array('files'),
	isAuthenticatedVerified,
	// [reqExpert, validateRequest],
	controller.reqExpert
);


module.exports = router;
