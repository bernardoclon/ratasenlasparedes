// Import Modules
import { ratasenlasparedesActor } from "./actor/actor.js";
import { ratasenlasparedesActorSheet } from "./actor/actor-sheet.js";
import { ratasenlasparedesNpcSheet } from "./actor/npc-sheet.js";
import { ratasenlasparedesItem } from "./item/item.js";
import { ratasenlasparedesItemSheet } from "./item/item-sheet.js";


Hooks.once('init', async function () {
    // Cargar estilos
    const styles = ['dialog.css'];
    styles.forEach(s => {
        const link = document.createElement('link');
        link.type = 'text/css';
        link.rel = 'stylesheet';
        link.href = 'systems/ratasenlasparedes/css/' + s;
        document.getElementsByTagName('head')[0].appendChild(link);
    });

    CONFIG.ChatMessage.template = "systems/ratasenlasparedes/templates/chat/chat-message.html";
    CONFIG.Dice.template = "systems/ratasenlasparedes/templates/dice/roll.html";
    CONFIG.Dice.tooltip = "systems/ratasenlasparedes/templates/dice/tooltip.html";
    Roll.CHAT_TEMPLATE = "systems/ratasenlasparedes/templates/dice/roll.html"
    Roll.TOOLTIP_TEMPLATE = "systems/ratasenlasparedes/templates/dice/tooltip.html"

    game.ratasenlasparedes = {
        ratasenlasparedesActor,
        ratasenlasparedesItem
    };

    // Solo el GM puede borrar mensajes
    CONFIG.ChatMessage.documentClass.prototype.canUserModify = function(user, action) {
        return user.isGM;
    };

    // Manejar el borrado de mensajes individuales
    Hooks.on('renderChatMessage', (message, html, data) => {
        if (game.user.isGM) {
            html.find('.message-delete').click(ev => {
                ev.preventDefault();
                message.delete();
            });
        }
    });

    /**
     * Set an initiative formula for the system
     * @type {String}
     */
    CONFIG.Combat.initiative = {
        formula: "1d6",
        decimals: 2
    };
    // Define custom Entity classes
    CONFIG.Actor.entityClass = ratasenlasparedesActor;
    CONFIG.Item.entityClass = ratasenlasparedesItem;

    // Register sheet application classes
    Actors.registerSheet("ratasenlasparedes", ratasenlasparedesActorSheet, {
        types: ['character'],
        makeDefault: true
    });
    Actors.registerSheet("ratasenlasparedes", ratasenlasparedesNpcSheet, {
        types: ['npc'],
        makeDefault: true
    });
    Actors.unregisterSheet("core", ActorSheet);

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("ratasenlasparedes", ratasenlasparedesItemSheet, { makeDefault: true });

    // Agregar helper de Handlebars para comparaciones
    Handlebars.registerHelper('eq', function(a, b) {
        return a === b;
    });

    Handlebars.registerHelper('or', function() {
        return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
    });

    // Si necesitas agregar más hooks del chat, agrégalos aquí

    // If you need to add Handlebars helpers, here are a few useful examples:
    Handlebars.registerHelper('concat', function () {
        var outStr = '';
        for (var arg in arguments) {
            if (typeof arguments[arg] != 'object') {
                outStr += arguments[arg];
            }
        }
        return outStr;
    });

    Handlebars.registerHelper('toLowerCase', function (str) {
        return str.toLowerCase();
    });
});

Handlebars.registerHelper('json', function (context) {
    return JSON.stringify(context);
});

Hooks.on('createItem', (sheet, aux, itemId) => {
    let profesions = sheet.actor.items.filter(i => i.type == "profesion");
    let reputations = sheet.actor.items.filter(i => i.type == "reputation");
    if (sheet.type == "profesion" && profesions.length > 1) {
        sheet.actor.deleteEmbeddedDocuments("Item", [profesions[0].id]);
    }
    if (sheet.type == "reputation" && reputations.length > 1) {
        sheet.actor.deleteEmbeddedDocuments("Item", [reputations[0].id]);
    }
});

Hooks.on("preCreateScene", (createData, options, userID) => {
    createData.backgroundColor = '#000000';
})


/* hide ui elements on logo click */
Hooks.on('ready', () => {
    $('#logo').click(ev => {
        window.hideUI = !window.hideUI;
        if (window.hideUI) {
            $('#sidebar').hide();
            $('#navigation').hide();
            $('#controls').hide();
            $('#players').hide();
            $('#hotbar').hide();
        } else {
            $('#sidebar').show();
            $('#navigation').show();
            $('#controls').show();
            $('#players').show();
            $('#hotbar').show();
        }
    });

    $('#chat-controls .fa-dice-d20').addClass("fa-dice-d6");
    $('#chat-controls .fa-dice-d20').removeClass("fa-dice-d20");



    $(document).on('click', '#chat-controls .fa-dice-d6', ev => {
        const dialogOptions = {
            width: 420,
            top: event.clientY - 80,
            left: window.innerWidth - 710,
            classes: ['dialog', 'ratas-dice-roller'],
        };
        let templateData = {
            title: 'Lanzador',
            rollClass: 'ratas-simple-roller-roll',
        };
        // Render the modal.
        renderTemplate('systems/ratasenlasparedes/templates/roller.html', templateData).then(dlg => {
            let dialogRoller = new Dialog({
                title: 'Lanzador',
                content: dlg,
                buttons: {
                }
            }, dialogOptions);
            dialogRoller.render(true);
        });
    });

    $(document).on('click', '.ratas-simple-roller-roll', ev => {
        let roll = new Roll(String($(ev.currentTarget).data('formula')));
        roll.roll();
        roll.toMessage();
    });

    $(document).on('click', '.ratas-sanity-check', ev => {
        let roll = new Roll(String($(ev.currentTarget).data('formula')));
        let actorId = String($(ev.currentTarget).data('actor-id'));
        roll.roll({async: false});
        let label = "Perdida de cordura.";
        let sanityData = {
            speaker: ChatMessage.getSpeaker({ actor: actorId }),
            flags: {'ratasenlasparedes':{'text':label, 'detail': roll.total}},
            flavor: label
        };

        roll.toMessage(sanityData);
        if (roll.total < 0) return;
        let pcMinus = game.actors.get(actorId).system.pc.value - roll.total;
        (pcMinus < 0) ? pcMinus = 0 : pcMinus = pcMinus;
        game.actors.get(actorId).update({ _id: actorId, 'system.pc.value': pcMinus });
    });

    // Mover la línea que causa el error al hook 'ready' y usar jQuery para mayor fiabilidad
    $('#logo').attr("src", "/systems/ratasenlasparedes/img/thp.png");
});

Hooks.on('renderSceneNavigation', (app, html) => {
    if (window.hideUI) {
        html.hide();
    }
});

Hooks.on('renderSceneControls', (app, html) => {
    if (window.hideUI) {
        html.hide();
    }
});

Hooks.on('renderSidebarTab', (app, html) => {
    if (window.hideUI) {
        html.hide();
    }
});

Hooks.on('renderCombatTracker', (app, html) => {
    if (window.hideUI) {
        html.hide();
    }
});


//Chat Messages
Hooks.on("createChatMessage", async (chatMSG, flags, userId) => {
    if (game.user.isGM) {
        let actor = Array.from(game.actors).find(actor => actor._id == chatMSG.speaker.actor);
        if (actor) {
            await chatMSG.setFlag("ratasenlasparedes", "profileImg", actor.img);
        }
    }

    if (game.user.isGM) {
        let actor = Array.from(game.actors).find(actor => actor._id == chatMSG.speaker.actor);
        chatMSG.setFlag("ratasenlasparedes", "profileImg", actor ? actor.img : game.user.avatar);
        chatMSG.setFlag("ratasenlasparedes", "detail", linearRoll);
    }
    //     console.log(actor);

    let messageId = chatMSG._id;
    let msg = game.messages.get(messageId);
    let msgIndex = game.messages.documentName.indexOf(msg);

    if (chatMSG.isRoll && chatMSG.isContentVisible) {
        let rollData = {
            //flavor: ChatMSG.getFlag('ratasenlasparedes', 'text'),
            formula: chatMSG.rolls.formula,
            username: game.user.name,
        };
        // console.log(rollData);
    }


});
