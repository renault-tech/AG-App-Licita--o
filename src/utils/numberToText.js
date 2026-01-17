/**
 * Utilitário para converter números em texto por extenso (português brasileiro)
 * Especializado em valores monetários
 */

const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function converterGrupo(num) {
    if (num === 0) return '';
    if (num === 100) return 'cem';

    let texto = '';
    const c = Math.floor(num / 100);
    const d = Math.floor((num % 100) / 10);
    const u = num % 10;

    if (c > 0) texto += centenas[c];

    if (d === 1) {
        if (texto) texto += ' e ';
        texto += especiais[u];
        return texto;
    }

    if (d > 1) {
        if (texto) texto += ' e ';
        texto += dezenas[d];
    }

    if (u > 0 && d !== 1) {
        if (texto) texto += ' e ';
        texto += unidades[u];
    }

    return texto;
}

export function currencyToExtendedText(value) {
    if (!value || isNaN(value)) return '';

    const partes = value.toFixed(2).split('.');
    const inteiro = parseInt(partes[0]);
    const centavos = parseInt(partes[1]);

    let texto = '';

    // Processar parte inteira
    if (inteiro === 0) {
        texto = 'zero';
    } else {
        const bilhao = Math.floor(inteiro / 1000000000);
        const milhao = Math.floor((inteiro % 1000000000) / 1000000);
        const milhar = Math.floor((inteiro % 1000000) / 1000);
        const resto = inteiro % 1000;

        if (bilhao > 0) {
            texto += converterGrupo(bilhao);
            texto += bilhao === 1 ? ' bilhão' : ' bilhões';
        }

        if (milhao > 0) {
            if (texto) texto += ', ';
            texto += converterGrupo(milhao);
            texto += milhao === 1 ? ' milhão' : ' milhões';
        }

        if (milhar > 0) {
            if (texto) {
                if (resto === 0 && centavos === 0) {
                    texto += ' e ';
                } else {
                    texto += ', ';
                }
            }
            texto += milhar === 1 ? 'mil' : converterGrupo(milhar) + ' mil';
        }

        if (resto > 0) {
            if (texto) texto += ' e ';
            texto += converterGrupo(resto);
        }
    }

    // Adicionar "reais"
    texto += inteiro === 1 ? ' real' : ' reais';

    // Processar centavos
    if (centavos > 0) {
        texto += ' e ' + converterGrupo(centavos);
        texto += centavos === 1 ? ' centavo' : ' centavos';
    }

    return texto;
}

export default currencyToExtendedText;
