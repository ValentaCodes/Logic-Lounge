const { AuthenticationError } = require('apollo-server-express');
const { User, Thought, Tutor, Skill } = require('../models');
const { signToken } = require('../utils/auth');

const resolvers = {
  Query: {
    users: async () => {
      return User.find().populate('skills').lean();
    },
    user: async (parent, { username }) => {
      return User.findOne({ username });
    },
    skills: async () => {
      return Skill.find();
    },
    thoughts: async (parent, { username }) => {
      const params = username ? { username } : {};
      return Thought.find(params).sort({ createdAt: -1 });
    },
    thought: async (parent, { thoughtId }) => {
      return Thought.findOne({ _id: thoughtId });
    },
    tutors: async () => {
      return Tutor.find();
    },
  },

  Mutation: {
    addTutor: async (parent, { tutorName, skills }) => {
      const tutor = await Tutor.create({ tutorName, skills });
      return { tutor };
    },
    removeTutor: async (parent, { tutorId }) => {
      return Tutor.findOneAndDelete({ _id: tutorId });
    },
    updateTutor: async (parent, { tutorId, tutorName, bio, img, skills }) => {
      return Tutor.findOneAndUpdate({
        _id: tutorId,
        tutorName,
        bio,
        img,
        skills,
      });
    },
    addUser: async (parent, { username, email, password }) => {
      const user = await User.create({ username, email, password });
      const token = signToken(user);
      return { token, user };
    },
    // This creates a new skill in database DOESNT ASSIGN TO USER
    addNewSkill: async (parent, { skillName }) => {
      return Skill.create({ skillName: skillName });
    },
    // Allows you to add a skill from database to a user
    addSkillToUser: async (parent, { userId, skillId }) => {
      const skill = await Skill.findById(skillId);
      return User.findOneAndUpdate(
        { _id: userId },
        {
          $addToSet: { skills: { _id: skillId, skillName: skill.skillName } },
        },
        {
          new: true,
          // runValidators: true,
        }
      ).lean();
    },
    removeSkillFromUser: async (parent, { skillId, userId }) => {
      return User.findOneAndUpdate(
        { _id: userId },
        { $pull: { skills: { _id: skillId } } },
        { new: true }
      ).lean();
    },
    removeSkill: async (parent, { skillId }) => {
      return Skill.findByIdAndDelete(skillId).lean();
    },
    login: async (parent, { username, password }) => {
      const user = await User.findOne({ username });

      if (!user) {
        throw new AuthenticationError('No user found with this username');
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError('Incorrect credentials');
      }

      const token = signToken(user);

      return { token, user };
    },
    addThought: async (parent, { thoughtText, thoughtAuthor }) => {
      const thought = await Thought.create({ thoughtText, thoughtAuthor });

      await User.findOneAndUpdate(
        { username: thoughtAuthor },
        { $addToSet: { thoughts: thought._id } }
      );

      return thought;
    },
    addComment: async (parent, { thoughtId, commentText, commentAuthor }) => {
      return Thought.findOneAndUpdate(
        { _id: thoughtId },
        {
          $addToSet: { comments: { commentText, commentAuthor } },
        },
        {
          new: true,
          runValidators: true,
        }
      );
    },
    removeThought: async (parent, { thoughtId }) => {
      return Thought.findOneAndDelete({ _id: thoughtId });
    },
    removeComment: async (parent, { thoughtId, commentId }) => {
      return Thought.findOneAndUpdate(
        { _id: thoughtId },
        { $pull: { comments: { _id: commentId } } },
        { new: true }
      );
    },
  },
};

module.exports = resolvers;
