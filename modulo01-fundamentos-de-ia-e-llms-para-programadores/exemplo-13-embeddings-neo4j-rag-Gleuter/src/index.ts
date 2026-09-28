import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { DocumentProcessor } from './documentProcessor.ts';
import { CONFIG } from './config.ts';
import { type PretrainedOptions } from "@huggingface/transformers";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import { ChatOpenAI } from "@langchain/openai";
import { AI } from "./ai.ts";
import { writeFile, mkdir } from 'node:fs/promises';

let _neo4jVectorStore = null;

async function clearAll(vectorStore: Neo4jVectorStore, nodeLabel: string) {
    console.log(`🚀 Limpando todos os nós do Neo4j com o label: ${nodeLabel}...\n`);

    await vectorStore.query(
        "MATCH (n:Chunk) DETACH DELETE n"
    );
    console.log(`✅ Todos os nós do Neo4j com o label: ${nodeLabel} foram removidos com sucesso!\n`);

}

try {
    console.log("🚀 Inicializando sistema de Embeddings com Neo4j...\n");

    const documentPrecessor = new DocumentProcessor(
        CONFIG.pdf.path,
        CONFIG.textSplitter
    );

    const documents = await documentPrecessor.loadAndSplit();
    //console.log(documents);
    const embeddings = new HuggingFaceTransformersEmbeddings({
        model: CONFIG.embedding.modelName,
        pretrainedOptions: CONFIG.embedding.pretrainedOptions as PretrainedOptions
    });


    const nlpModel = new ChatOpenAI({
        temperature: CONFIG.openRouter.temperature,
        maxRetries: CONFIG.openRouter.maxRetries,
        modelName: CONFIG.openRouter.nlpModel,
        openAIApiKey: CONFIG.openRouter.apiKey,
        configuration: {
            baseURL: CONFIG.openRouter.url,
            defaultHeaders: CONFIG.openRouter.defaultHeaders
        }
    });

    //  const response = await embeddings.embedQuery(
    //    "JavaScript"
    //)

    //const response = await embeddings.embedDocuments(
    //  ["Javascript"]
    //)

    //  console.log('response', response)

    _neo4jVectorStore = await Neo4jVectorStore.fromExistingGraph(
        embeddings,
        CONFIG.neo4j
    );

    await clearAll(_neo4jVectorStore, CONFIG.neo4j.nodeLabel);
    console.log(Object.entries(documents))

    for (const [index, doc] of documents.entries()) {
        console.log(`✅ Adicionando documento ${index + 1}/${documents.length}`);
        await _neo4jVectorStore.addDocuments([doc])
    }

    console.log("\n✅ Base de dados populada com sucesso!\n");
    //===========================================================================
    console.log("ETAPA 02 Buscando a Similaridade\n");

    const questions = [
        "O que são tensores e como são representados em JavaScript?",
        "Como converter objetos JavaScript em tensores?",
        "O que é normalização de dados e por que é necessária?",
        "Como funciona uma rede neural no TensorFlow.js?",
        "O que significa treinar uma rede neural?",
        "O que é hot encoding e quando usar?"
    ]

    const ai = new AI(
        {
            nlpModel,
            debugLog: console.log,
            vectorStore: _neo4jVectorStore,
            promptConfig: CONFIG.promptConfig,
            templateText: CONFIG.templateText,
            topK: CONFIG.similarity.topK
        }
    );

    for (const index in questions) {
    const question = questions[index]
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📌 PERGUNTA: ${question}`);
    console.log('='.repeat(80));
    const result = await ai.answerQuestion(question!)
    if(result.error) {
        console.log(`\n❌ Erro: ${result.error}\n`);
        continue
    }

    console.log(`\n${result.answer}\n`);
    await mkdir(CONFIG.output.answersFolder, { recursive: true })

    const fileName = `${CONFIG.output.answersFolder}/${CONFIG.output.fileName}_${index}_${Date.now()}.md`

    await writeFile(fileName, result.answer!)
}



} catch (error) {
    console.error('Error occurred:', error);
} finally {
    await _neo4jVectorStore?.close();
    console.log("✅ Conexão com Neo4j encerrada com sucesso!\n");
}
