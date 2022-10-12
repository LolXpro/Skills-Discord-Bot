import { Collection, EmbedBuilder, PermissionsBitField, RoleManager, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const skillConfigFile = path.join(__dirname, './skills.json');

export default {
	data: new SlashCommandBuilder()
		.setName('skills')
		.setDescription('Skills')
		.addSubcommand(subcommand =>
			subcommand
				.setName('info')
				.setDescription('Description of how this Bot works')
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Add Skills to your User')
				.addStringOption(option =>
					option
						.setName('skill')
						.setDescription('Select a Skill')
						.setRequired(true))
				.addStringOption(option =>
					option
						.setName('level')
						.setDescription('Select your Level')
						.setRequired(false)
						.addChoices(
							{name: 'Beginner', value: '1'},
							{name: 'Advanced', value: '2'},
							{name: 'Expert', value: '3'})))
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('Removes a Skill')
				.addStringOption(option =>
					option
						.setName('skill')
						.setDescription('The Skill you want to remove')
						.setRequired(true)))
		.addSubcommandGroup(group =>
			group
				.setName('list')
				.setDescription('Edit Skill-list')
				.addSubcommand(subcommand =>
					subcommand
						.setName('all')
						.setDescription('List all skills'))
				.addSubcommand(subcommand =>
					subcommand
						.setName('add')
						.setDescription('Add a new Skill to the List')
						.addStringOption(option =>
							option
								.setName('skill')
								.setDescription('The Name of the new Skill')
								.setRequired(true))
						.addStringOption(option =>
							option
								.setName('color')
								.setDescription('The Color of the Skill in HEX (e.g. #95A5A6); Default Grey')
								.setMinLength(7)
								.setMaxLength(7)
								.setRequired(false))
						.addBooleanOption(option =>
							option
								.setName('generate')
								.setDescription('Generate the required Roles automatically')
								.setRequired(false)))
				.addSubcommand(subcommand =>
					subcommand
						.setName('remove')
						.setDescription('Removes Skill from the List')
						.addStringOption(option =>
							option
								.setName('skill')
								.setDescription('The Name of the Skill')
								.setRequired(true))
						.addBooleanOption(option =>
							option
								.setName('remove')
								.setDescription('Remove the unused Roles automatically')
								.setRequired(false)))
				.addSubcommand(subcommand =>
					subcommand
						.setName('color')
						.setDescription('Change the Level-Colors')
						.addStringOption(option =>
							option
								.setName('skill')
								.setDescription('The Skill you want to override')
								.setRequired(true))
						.addStringOption(option =>
							option
								.setName('color')
								.setDescription('The new Color in hex (e.g.: #00ffc8)')
								.setMinLength(7)
								.setMaxLength(7)
								.setRequired(true)))),

	async execute(interaction) {
		switch (interaction.options.getSubcommandGroup()){
		default:
			switch (interaction.options.getSubcommand()) {
			case 'info':
				return getInfo(interaction);
			case 'add':
				return addSkill(interaction);
			case 'remove':
				return removeSkill(interaction);
			}
		case 'list':
				switch (interaction.options.getSubcommand()) {
				case 'all':
					return listSkills(interaction);
				case 'add':
					return addSkillToList(interaction, PermissionsBitField.Flags.ManageRoles);
				case 'remove':
					return removeSkillFromList(interaction, PermissionsBitField.Flags.ManageRoles);
				}
		case 'config':
			switch (interaction.options.getSubcommand()){
			case 'color':
				return setColor(interaction, PermissionsBitField.Flags.ManageRoles);
			}
		}
	}
}

//Manage Own Skills
function addSkill(interaction, permission = null) {
	if(permission !== null){
		if (!interaction.member.permissions.has(permission)) return interaction.reply({content: 'Your permissions are insufficient'});
	}

	const rawSkill = interaction.options.getString('skill');
	const level = parseInt(interaction.options.getString('level')) || 1;
	const data = JSON.parse(fs.readFileSync(skillConfigFile));
	const list = data.list;
	const skill = `${rawSkill} [${data.levels[level]}]`;
	const role = interaction.guild.roles.cache.find(role => role.name === skill);

	if (role && list.find(e => e.name === rawSkill)){
		const oldRole = interaction.member.roles.cache.find(role => role.name.includes(rawSkill));
		if(oldRole){
			interaction.member.roles.remove(oldRole);
		}
		interaction.member.roles.add(role);
		interaction.reply({content: `Skill ${rawSkill} added`, ephemeral: true})
	}else {
		interaction.reply({content: 'Skill does not exist!', ephemeral: true})
	}
}

function removeSkill(interaction, permission = null) {
	if(permission !== null){
		if (!interaction.member.permissions.has(permission)) return interaction.reply({content: 'Your permissions are insufficient'});
	}

	const skill = interaction.options.getString('skill');
	const role = interaction.member.roles.cache.find(role => role.name.includes(skill))
	if (role){
		interaction.member.roles.remove(role);
		interaction.reply({content: 'Skill removed', ephemeral: true})
	}
}

//Configure Skills
function addSkillToList(interaction, permission = null) {
	if(permission !== null){
		if (!interaction.member.permissions.has(permission)) return interaction.reply({content: 'Your permissions are insufficient'});
	}

	const skill = interaction.options.getString('skill');
	const color = interaction.options.getString('color') || '#95A5A6';
	const generate = interaction.options.getBoolean('generate') || false;

	let data = JSON.parse(fs.readFileSync(skillConfigFile));
	let list = data.list;

	//Add to List
	if(!list.find(e => e.name === skill)){
		list.push({
			name: skill,
			color: color
		});
		list.sort( function(a, b){
			return a.name.localeCompare(b.name);
		});
		data.list = list;
		fs.writeFileSync(skillConfigFile, JSON.stringify(data, null, 4));
	}

	//Generate Role
	if (generate) {
		for (let i = 0; i < data.levels.length; i++) {
			interaction.guild.roles.create({
				name: `${skill} [${data.levels[i]}]`,
				color: color,
				reason: ''
			});
		}
	}
	interaction.reply({ content: 'Added Skill to the List', ephemeral: true });
}

function removeSkillFromList(interaction, permission = null) {
	if(permission !== null){
		if (!interaction.member.permissions.has(permission)) return interaction.reply({content: 'Your permissions are insufficient'});
	}

	const skill = interaction.options.getString('skill');
	const remove = interaction.options.getBoolean('remove') || false;
	let data = JSON.parse(fs.readFileSync(skillConfigFile));
	let list = data.list;
	const index = list.indexOf(list.find(e => e.name === skill));
	list.splice(index, 1);
	data.list = list;
	fs.writeFileSync(skillConfigFile, JSON.stringify(data, null, 4));

	if (remove) {
		for (let i = 0; i < data.levels.length; i++) {
			let name = `${skill} [${data.levels[i]}]`;
			let role = interaction.guild.roles.cache.find(role => role.name === name);
			interaction.guild.roles.delete(role);
		}
	}
	interaction.reply({ content: `Removed ${skill} from List`, ephemeral: true});
}

function listSkills(interaction, permission = null) {
	if(permission !== null){
		if (!interaction.member.permissions.has(permission)) return interaction.reply({content: 'Your permissions are insufficient'});
	}

	const skillsEmbed = new EmbedBuilder()
	const data = JSON.parse(fs.readFileSync(skillConfigFile));
	let list = [];
	data.list.forEach(e => list.push(e.name));
	list = list.toString().replaceAll(",", "\n");
	if(list === '') list = 'No Skills available';
	skillsEmbed.addFields({name: 'Skills', value: list});
	interaction.reply({embeds: [skillsEmbed], ephemeral: true });
}

function setColor(interaction, permission = null) {
	if(permission !== null){
		if (!interaction.member.permissions.has(permission)) return interaction.reply({content: 'Your permissions are insufficient'});
	}

	const skill = interaction.options.getString('skill');
	const color = interaction.options.getString('color');
	let data = JSON.parse(fs.readFileSync(skillConfigFile));
	data.list.find(e => e.name === skill).color = color;
	fs.writeFileSync(skillConfigFile, JSON.stringify(data, null, 4));

	new RoleManager(interaction.guild).edit(interaction.guild.roles.cache.find(e => e.name === skill), { color: color }).then(r => )
	interaction.reply({content: `Color of Skill ${skill} has changed`, ephemeral: true})
}

function getInfo(interaction){
	const infoEmbed = new EmbedBuilder()
		infoEmbed
			.setTitle('Skills Info')
			.setDescription('Here\'s a quick explanation of how this Bot works! \n All with * marked fields a required')
			.addFields({name:'Show the list of Skills', value:'/skills list all'})
			.addFields({name:'Add a Skill to your Profile', value:'/skills add [skill*] [level] \n There a 3 Levels: Beginner | Advanced | Expert'})
			.addFields({name:'Remove a Skill from your Profile', value:'/skills remove [skill*]'})
			.addFields({name:'\u200B', value: 'The following part requires the rights to modify roles'})
			.addFields({name:'Add a new Skill to the List', value:'/skills list add [skill*] [color] [generate required Roles]'})
			.addFields({name:'Remove a Skill from the List', value:'/skills list remove [skill*]'})
			.addFields({name:'Change the color of a Skill', value:'/skills list color [skill*] [color*]'})
	interaction.reply({embeds: [infoEmbed], ephemeral: true})
}